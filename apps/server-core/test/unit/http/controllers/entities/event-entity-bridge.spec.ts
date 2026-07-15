/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName, EventScope, PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeRealm, createFakeRole } from '../../../../utils';

const SECRET_KEY_REGEX = /(password|secret|hash|token|credential)/i;

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

        const { data } = await suite.client.user.getMany({ filter: { name: 'admin' } });
        expect(data).toHaveLength(1);
        adminUserId = data[0].id;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('records an attributed, expiring created row for an entity create', async () => {
        const role = await suite.client.role.create(createFakeRole());

        const { data } = await suite.client.event.getMany({
            filter: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                ref_id: role.id,
            },
        });

        expect(data).toHaveLength(1);
        const [row] = data;
        expect(row.ref_type).toEqual('role');
        expect(row.ref_id).toEqual(role.id);
        expect(row.actor_type).toEqual('user');
        expect(row.actor_id).toEqual(adminUserId);
        expect(row.actor_name).toEqual('admin');
        expect(row.request_method).toEqual('POST');
        expect(row.request_path).toBeTruthy();
        expect(row.realm_id).toEqual(role.realm_id);
        expect(row.expiring).toBeTruthy();
        expect(row.expires_at).not.toBeNull();
        expect(row.data).toBeNull();
    });

    it('records an updated row with a next/previous scalar diff', async () => {
        const role = await suite.client.role.create(createFakeRole({ description: 'before' }));
        await suite.client.role.update(role.id, { description: 'after' });

        const { data } = await suite.client.event.getMany({
            filter: {
                scope: EventScope.ENTITY,
                name: EventName.UPDATED,
                ref_id: role.id,
            },
        });

        expect(data).toHaveLength(1);
        const [row] = data;
        expect(row.ref_type).toEqual('role');
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
            auth_method: 'secret',
            token_binding_method: 'none',
            secret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        await suite.client.client.update(client.id, { secret: nextSecret });

        const { data } = await suite.client.event.getMany({
            filter: {
                scope: EventScope.ENTITY,
                name: EventName.UPDATED,
                ref_id: client.id,
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
            filter: {
                scope: EventScope.ENTITY,
                name: EventName.DELETED,
                ref_id: role.id,
            },
        });

        expect(data).toHaveLength(1);
        expect(data[0].ref_type).toEqual('role');
        expect(data[0].actor_id).toEqual(adminUserId);
    });

    it('keeps a foreign-realm entity row hidden from an own-scoped reader', async () => {
        // an entity row in the reader's own realm (master) — the control
        const ownRole = await suite.client.role.create(createFakeRole());

        // an entity row in a foreign realm (B)
        const realmB = await suite.client.realm.create(createFakeRealm());
        const foreignRole = await suite.client.role.create(
            createFakeRole({ realm_id: realmB.id }),
        );

        // a restricted actor in master holding EVENT_READ at the default `own` scope
        const actorSecret = 'bridge-realm-iso-actor-secret';
        const actorClient = await suite.client.client.create({
            ...createFakeClient(),
            auth_method: 'secret',
            token_binding_method: 'none',
            secret: actorSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        const permission = await suite.client.permission.getOne(PermissionName.EVENT_READ);
        await suite.client.clientPermission.create({
            client_id: actorClient.id,
            permission_id: permission.id,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: actorSecret,
        });
        const actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        // control: the own-realm entity row IS visible
        const own = await actor.event.getMany({
            filter: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                ref_id: ownRole.id,
            },
        });
        expect(own.data.some((row) => row.ref_id === ownRole.id)).toBe(true);

        // the foreign-realm entity row must NOT appear
        const foreign = await actor.event.getMany({
            filter: {
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                ref_id: foreignRole.id,
            },
        });
        expect(foreign.data.some((row) => row.ref_id === foreignRole.id)).toBe(false);
    });
});
