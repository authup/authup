/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
import { Client as HTTPClient } from '@authup/core-http-kit';
import type { Client, Realm } from '@authup/core-kit';
import { PermissionName, ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
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
    createFakeUser,
    expectClientError,
} from '../../../../utils';

describe('client token exchange policies', () => {
    const suite = createTestApplication();

    let realm: Realm;
    let otherRealm: Realm;
    let client: Client;
    let otherClient: Client;
    let realmAdmin: HTTPClient;
    let reader: HTTPClient;

    let audienceCounter = 0;

    function nextAudience() {
        audienceCounter += 1;

        return `audience-${audienceCounter}`;
    }

    function buildPayload(clientId: string, audience: string = nextAudience()) {
        return {
            clientId,
            audience,
            capabilityTypes: 'bucket bucket-file',
            maxLifetime: 3600,
        };
    }

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        otherRealm = (await suite.client.realm.create(createFakeRealm())).data;

        client = (await suite.client.client.create(createFakeClient({ realmId: realm.id }))).data;
        otherClient = (await suite.client.client.create(createFakeClient({ realmId: otherRealm.id }))).data;

        // the built-in realm_admin of `realm`: it holds `client_update` at own
        // reach and must still get nowhere near a token exchange policy
        const password = 'token-exchange-realm-admin-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));
        const { data: role } = await suite.client.role.getOne(ROLE_REALM_ADMIN_NAME);

        await suite.client.userRole.create({ userId: user.id, roleId: role.id });

        const adminToken = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        realmAdmin = new HTTPClient({ baseURL: suite.baseURL });
        realmAdmin.setAuthorizationHeader({ type: 'Bearer', token: adminToken.access_token });

        // a dedicated grant held at `own` reach
        const readerSecret = 'token-exchange-reader-secret';
        const { data: readerClient } = await suite.client.client.create({
            ...createFakeClient({ realmId: realm.id }),
            secret: readerSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ);

        await suite.client.clientPermission.create({
            clientId: readerClient.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
        });

        const readerToken = await suite.client.token.createWithClientCredentials({
            client_id: readerClient.id,
            client_secret: readerSecret,
        });

        reader = new HTTPClient({ baseURL: suite.baseURL });
        reader.setAuthorizationHeader({ type: 'Bearer', token: readerToken.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('crud as a global admin', () => {
        it('should create, read, update and delete a policy', async () => {
            const payload = buildPayload(client.id);

            const { data: created } = await suite.client.clientTokenExchangePolicy.create(payload);

            expect(created.id).toBeDefined();
            expect(created.clientId).toEqual(client.id);
            expect(created.audience).toEqual(payload.audience);
            expect(created.capabilityTypes).toEqual('bucket bucket-file');
            expect(created.maxLifetime).toEqual(3600);
            expect(created.subjectRealmScope).toEqual('own');
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
            expect(created).not.toHaveProperty('client');

            const { data: read } = await suite.client.clientTokenExchangePolicy.getOne(created.id);

            expect(read.id).toEqual(created.id);

            const { data: updated } = await suite.client.clientTokenExchangePolicy.update(created.id, {
                maxLifetime: 60,
                subjectRealmScope: 'any',
            });

            expect(updated.maxLifetime).toEqual(60);
            expect(updated.subjectRealmScope).toEqual('any');
            expect(updated.audience).toEqual(payload.audience);

            await suite.client.clientTokenExchangePolicy.delete(created.id);

            await expectClientError(
                () => suite.client.clientTokenExchangePolicy.getOne(created.id),
                { status: 404, code: ErrorCode.ENTITY_NOT_FOUND },
            );
        });

        it('should list policies filtered by client and report the schema', async () => {
            const payload = buildPayload(otherClient.id);

            const { data: created } = await suite.client.clientTokenExchangePolicy.create(payload);

            const { data, meta } = await suite.client.clientTokenExchangePolicy.getMany({ filters: { clientId: otherClient.id } });

            expect(data.map((row) => row.id)).toContain(created.id);
            expect(data.every((row) => row.clientId === otherClient.id)).toBe(true);
            expect(meta.schema).toBeDefined();
        });

        it('should include the client relation', async () => {
            const { data: created } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));

            const { data } = await suite.client.clientTokenExchangePolicy.getMany({
                filters: { id: created.id },
                relations: ['client'],
            });

            expect(data[0].client.id).toEqual(client.id);
        });

        it('should answer the schema route', async () => {
            const response = await suite.client.clientTokenExchangePolicy.getSchema();

            expect(response.data.filters).toBeDefined();
        });
    });

    describe('owner fields', () => {
        it('should take the realm from the client and not the body', async () => {
            const payload = { ...buildPayload(client.id), realmId: otherRealm.id };

            const { data } = await suite.client.clientTokenExchangePolicy.create(payload);

            expect(data.realmId).toEqual(realm.id);
        });

        it('should not move a policy to another client or realm', async () => {
            const { data: created } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));
            const body = {
                clientId: otherClient.id,
                realmId: otherRealm.id,
                maxLifetime: 120,
            };

            const { data: updated } = await suite.client.clientTokenExchangePolicy.update(created.id, body);

            expect(updated.maxLifetime).toEqual(120);
            expect(updated.clientId).toEqual(client.id);
            expect(updated.realmId).toEqual(realm.id);
        });

        it('should reject an unknown client', async () => {
            await expectClientError(
                () => suite.client.clientTokenExchangePolicy.create(buildPayload('6f4b5e0a-7f7b-4d43-9b0e-0a2f7a7a0001')),
                { status: 400 },
            );
        });
    });

    describe('uniqueness', () => {
        it('should conflict on the same client and audience', async () => {
            const payload = buildPayload(client.id);

            await suite.client.clientTokenExchangePolicy.create(payload);

            await expectClientError(
                () => suite.client.clientTokenExchangePolicy.create(payload),
                { status: 409, code: ErrorCode.ENTITY_CONFLICT },
            );
        });

        it('should allow the same audience on another client', async () => {
            const audience = nextAudience();

            await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id, audience));

            const { data } = await suite.client.clientTokenExchangePolicy.create(buildPayload(otherClient.id, audience));

            expect(data.audience).toEqual(audience);
        });

        it('should conflict when an update takes an audience in use', async () => {
            const taken = nextAudience();

            await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id, taken));

            const { data: second } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));

            await expectClientError(
                () => suite.client.clientTokenExchangePolicy.update(second.id, { audience: taken }),
                { status: 409, code: ErrorCode.ENTITY_CONFLICT },
            );
        });
    });

    describe('cascade', () => {
        it('should remove the policies of a deleted client', async () => {
            const { data: doomed } = await suite.client.client.create(createFakeClient({ realmId: realm.id }));
            const { data: policy } = await suite.client.clientTokenExchangePolicy.create(buildPayload(doomed.id));

            await suite.client.client.delete(doomed.id);

            await expectClientError(
                () => suite.client.clientTokenExchangePolicy.getOne(policy.id),
                { status: 404, code: ErrorCode.ENTITY_NOT_FOUND },
            );
        });
    });

    describe('validation', () => {
        it.each([
            ['an empty audience', { audience: '' }],
            ['an audience with whitespace', { audience: 'a b' }],
            ['an audience too long', { audience: 'a'.repeat(257) }],
            ['no capability type', { capabilityTypes: '' }],
            ['a malformed capability type', { capabilityTypes: 'Bucket' }],
            ['a duplicate capability type', { capabilityTypes: 'bucket bucket' }],
            ['a zero lifetime', { maxLifetime: 0 }],
            ['a lifetime above the ceiling', { maxLifetime: 86401 }],
            ['a fractional lifetime', { maxLifetime: 1.5 }],
            ['an unknown subject realm scope', { subjectRealmScope: 'all' }],
        ])('should reject %s', async (_label, patch) => {
            const body = { ...buildPayload(client.id), ...patch } as ReturnType<typeof buildPayload>;

            await expectClientError(
                () => suite.client.clientTokenExchangePolicy.create(body),
                { status: 400 },
            );
        });
    });

    describe('the subject realm scope any', () => {
        const buildWriter = async (realmScope: `${RealmScope}`) => {
            const secret = `token-exchange-writer-${realmScope}`;
            const { data: writerClient } = await suite.client.client.create({
                ...createFakeClient({ realmId: realm.id }),
                secret,
                secretHashed: false,
                secretEncrypted: false,
            });
            const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE);

            await suite.client.clientPermission.create({
                clientId: writerClient.id,
                permissionId: permission.id,
                realmScope,
            });

            const token = await suite.client.token.createWithClientCredentials({
                client_id: writerClient.id,
                client_secret: secret,
            });

            const writer = new HTTPClient({ baseURL: suite.baseURL });

            writer.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

            return writer;
        };

        it('should refuse a grant held at own reach', async () => {
            const writer = await buildWriter(RealmScope.OWN);

            await expectClientError(
                () => writer.clientTokenExchangePolicy.create({ ...buildPayload(client.id), subjectRealmScope: 'any' }),
                { status: 403 },
            );

            const { data } = await writer.clientTokenExchangePolicy.create(buildPayload(client.id));

            expect(data.subjectRealmScope).toEqual('own');
        });

        it('should allow an unbounded grant', async () => {
            const writer = await buildWriter(RealmScope.ANY);

            const { data } = await writer.clientTokenExchangePolicy.create({
                ...buildPayload(client.id),
                subjectRealmScope: 'any',
            });

            expect(data.subjectRealmScope).toEqual('any');
        });
    });

    describe('management is withheld from realm_admin', () => {
        it('should refuse the list', async () => {
            await expectClientError(
                () => realmAdmin.clientTokenExchangePolicy.getMany(),
                { status: 403 },
            );
        });

        it('should refuse the read of a policy of its own realm', async () => {
            const { data: policy } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));

            await expectClientError(
                () => realmAdmin.clientTokenExchangePolicy.getOne(policy.id),
                { status: 403 },
            );
        });

        it('should refuse the create on a client of its own realm', async () => {
            await expectClientError(
                () => realmAdmin.clientTokenExchangePolicy.create(buildPayload(client.id)),
                { status: 403 },
            );
        });

        it('should refuse the update of a policy of its own realm', async () => {
            const { data: policy } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));

            await expectClientError(
                () => realmAdmin.clientTokenExchangePolicy.update(policy.id, { maxLifetime: 60 }),
                { status: 403 },
            );
        });

        it('should refuse the delete of a policy of its own realm', async () => {
            const { data: policy } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));

            await expectClientError(
                () => realmAdmin.clientTokenExchangePolicy.delete(policy.id),
                { status: 403 },
            );
        });
    });

    describe('realm reach', () => {
        it('should hold an own-reach reader to its own realm', async () => {
            const { data: own } = await suite.client.clientTokenExchangePolicy.create(buildPayload(client.id));
            const { data: foreign } = await suite.client.clientTokenExchangePolicy.create(buildPayload(otherClient.id));

            const { data } = await reader.clientTokenExchangePolicy.getMany({ pagination: { limit: 50 } });

            expect(data.every((row) => row.realmId === realm.id)).toBe(true);

            const { data: read } = await reader.clientTokenExchangePolicy.getOne(own.id);

            expect(read.id).toEqual(own.id);

            await expectClientError(
                () => reader.clientTokenExchangePolicy.getOne(foreign.id),
                { status: 403 },
            );
        });

        it('should refuse a reader the write verbs', async () => {
            await expectClientError(
                () => reader.clientTokenExchangePolicy.create(buildPayload(client.id)),
                { status: 403 },
            );
        });

        it('should refuse an anonymous caller', async () => {
            const anonymous = new HTTPClient({ baseURL: suite.baseURL });

            await expectClientError(
                () => anonymous.clientTokenExchangePolicy.getMany(),
                { status: 401 },
            );
        });
    });
});
