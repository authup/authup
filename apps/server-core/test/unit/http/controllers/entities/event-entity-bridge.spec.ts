/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type Event,
    EventName,
    EventScope,
    PermissionName,
} from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { RealmScope } from '@authup/access';
import { buildQuery } from 'rapiq';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import {
    createFakeClient,
    createFakeRealm,
    createFakeRole,
    httpRequest,
} from '../../../../utils';

const SECRET_KEY_REGEX = /(password|secret|hash|token|credential)/i;
const ADMIN_AUTHORIZATION = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

/**
 * End-to-end coverage for the entity-CRUD audit bridge (plan 057 Stage 2):
 * every entity write published on the domain-event bus lands as an
 * auth_events row with scope `entity`, actor attribution from the originating
 * HTTP request (ALS middleware), a PII-safe scalar diff on updates, and the
 * short entity retention TTL.
 */
describe('event (entity-CRUD bridge)', () => {
    const suite = createTestApplication();

    let adminUserId: string;

    beforeAll(async () => {
        await suite.setup();

        const { data } = await suite.client.user.getMany({ filters: { name: 'admin' } });
        expect(data).toHaveLength(1);
        adminUserId = data[0].id;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('records an attributed, expiring created row for an entity create', async () => {
        const role = await suite.client.role.create(createFakeRole());

        const { data } = await suite.client.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refId: role.id,
            },
        });

        expect(data).toHaveLength(1);
        const [row] = data;
        expect(row.refType).toEqual('role');
        expect(row.refId).toEqual(role.id);
        expect(row.actorType).toEqual('user');
        expect(row.actorId).toEqual(adminUserId);
        expect(row.actorName).toEqual('admin');
        expect(row.requestMethod).toEqual('POST');
        expect(row.requestPath).toBeTruthy();
        expect(row.realmId).toEqual(role.realmId);
        expect(row.expiring).toBeTruthy();
        expect(row.expiresAt).not.toBeNull();
        expect(row.data).toBeNull();
    });

    it('records an updated row with a next/previous scalar diff', async () => {
        const role = await suite.client.role.create(createFakeRole({ description: 'before' }));
        await suite.client.role.update(role.id, { description: 'after' });

        const { data } = await suite.client.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.UPDATED,
                refId: role.id,
            },
        });

        expect(data).toHaveLength(1);
        const [row] = data;
        expect(row.refType).toEqual('role');
        expect(row.data).toBeDefined();
        expect(row.data!.diff.description).toEqual({
            next: 'after',
            previous: 'before',
        });
    });

    it('never carries secret material in a client-secret update diff', async () => {
        const secret = 'bridge-initial-secret-value';
        const nextSecret = 'bridge-rotated-secret-value';

        const client = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });
        await suite.client.client.update(client.id, { secret: nextSecret });

        const { data } = await suite.client.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.UPDATED,
                refId: client.id,
            },
        });

        expect(data.length).toBeGreaterThanOrEqual(1);
        for (const row of data) {
            const serialized = JSON.stringify(row.data ?? {});
            expect(serialized).not.toContain(secret);
            expect(serialized).not.toContain(nextSecret);

            const diffKeys = Object.keys(row.data?.diff ?? {});
            expect(diffKeys.filter((key) => SECRET_KEY_REGEX.test(key))).toHaveLength(0);
        }
    });

    it('records a deleted row for an entity delete', async () => {
        const role = await suite.client.role.create(createFakeRole());
        await suite.client.role.delete(role.id);

        const { data } = await suite.client.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.DELETED,
                refId: role.id,
            },
        });

        expect(data).toHaveLength(1);
        expect(data[0].refType).toEqual('role');
        expect(data[0].actorId).toEqual(adminUserId);
    });

    it('keeps a foreign-realm entity row hidden from an own-scoped reader', async () => {
        // an entity row in the reader's own realm (master) — the control
        const ownRole = await suite.client.role.create(createFakeRole());

        // an entity row in a foreign realm (B)
        const realmB = await suite.client.realm.create(createFakeRealm());
        const foreignRole = await suite.client.role.create(
            createFakeRole({ realmId: realmB.id }),
        );

        // a restricted actor in master holding EVENT_READ at the default `own` scope
        const actorSecret = 'bridge-realm-iso-actor-secret';
        const actorClient = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: actorSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const permission = await suite.client.permission.getOne(PermissionName.EVENT_READ);
        await suite.client.clientPermission.create({
            clientId: actorClient.id,
            permissionId: permission.id,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: actorSecret,
        });
        const actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        // control: the own-realm entity row IS visible
        const own = await actor.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refId: ownRole.id,
            },
        });
        expect(own.data.some((row) => row.refId === ownRole.id)).toBe(true);

        // the foreign-realm entity row must NOT appear
        const foreign = await actor.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refId: foreignRole.id,
            },
        });
        expect(foreign.data.some((row) => row.refId === foreignRole.id)).toBe(false);
    });

    it('attributes a junction event to its owner realm and hides it from an ownOrNull reader', async () => {
        const realmB = await suite.client.realm.create(createFakeRealm());
        const foreignRole = await suite.client.role.create(
            createFakeRole({ realmId: realmB.id }),
        );
        const userRead = await suite.client.permission.getOne(PermissionName.USER_READ);
        const binding = await suite.client.rolePermission.create({
            roleId: foreignRole.id,
            permissionId: userRead.id,
        });

        const recorded = await suite.client.event.getMany({
            filters: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                refId: binding.id,
            },
        });
        expect(recorded.data).toHaveLength(1);
        expect(recorded.data[0].refType).toEqual('rolePermission');
        expect(recorded.data[0].realmId).toEqual(realmB.id);

        const query = buildQuery({ filters: { id: recorded.data[0].id } });
        const ownRouteResponse = await httpRequest(
            suite,
            'GET',
            `/realms/master/events${query}`,
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(ownRouteResponse.status).toEqual(200);
        const ownRouteBody = await ownRouteResponse.json() as { data: Event[] };
        expect(ownRouteBody.data).toHaveLength(0);

        const foreignRouteResponse = await httpRequest(
            suite,
            'GET',
            `/realms/${realmB.id}/events${query}`,
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(foreignRouteResponse.status).toEqual(200);
        const foreignRouteBody = await foreignRouteResponse.json() as { data: Event[] };
        expect(foreignRouteBody.data.map((row) => row.id)).toEqual([recorded.data[0].id]);

        const wrongRouteRecord = await httpRequest(
            suite,
            'GET',
            `/realms/master/events/${recorded.data[0].id}`,
            { headers: { Authorization: ADMIN_AUTHORIZATION } },
        );
        expect(wrongRouteRecord.status).toEqual(404);

        const actorSecret = 'bridge-own-or-null-actor-secret';
        const actorClient = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: actorSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const eventRead = await suite.client.permission.getOne(PermissionName.EVENT_READ);
        await suite.client.clientPermission.create({
            clientId: actorClient.id,
            permissionId: eventRead.id,
            realmScope: RealmScope.OWN_OR_NULL,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: actorSecret,
        });
        const actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        const foreign = await actor.event.getMany({ filters: { id: recorded.data[0].id } });
        expect(foreign.data).toHaveLength(0);
        expect(foreign.meta.total).toEqual(0);

        const foreignBeyondPage = await actor.event.getMany({
            filters: { id: recorded.data[0].id },
            pagination: { limit: 1, offset: 1 },
        });
        expect(foreignBeyondPage.data).toHaveLength(0);
        expect(foreignBeyondPage.meta.total).toEqual(0);
    });
});
