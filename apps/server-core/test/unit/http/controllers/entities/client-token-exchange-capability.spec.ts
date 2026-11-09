/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFileSync } from 'node:fs';
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

describe('client token exchange capabilities', () => {
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
            value: 'bucket bucket-file',
            maxAge: 3600,
        };
    }

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        otherRealm = (await suite.client.realm.create(createFakeRealm())).data;

        client = (await suite.client.client.create(createFakeClient({ realmId: realm.id }))).data;
        otherClient = (await suite.client.client.create(createFakeClient({ realmId: otherRealm.id }))).data;

        // the built-in realm_admin of `realm`: it holds `client_update` at own
        // reach and must still get nowhere near a token exchange capability
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
        const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ);

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
        it('should create, read, update and delete a capability', async () => {
            const payload = buildPayload(client.id);

            const { data: created } = await suite.client.clientTokenExchangeCapability.create(payload);

            expect(created.id).toBeDefined();
            expect(created.clientId).toEqual(client.id);
            expect(created.audience).toEqual(payload.audience);
            expect(created.value).toEqual('bucket bucket-file');
            expect(created.maxAge).toEqual(3600);
            expect(created.realmScope).toEqual('own');
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
            expect(created).not.toHaveProperty('client');

            const { data: read } = await suite.client.clientTokenExchangeCapability.getOne(created.id);

            expect(read.id).toEqual(created.id);

            const { data: updated } = await suite.client.clientTokenExchangeCapability.update(created.id, {
                maxAge: 60,
                realmScope: 'any',
            });

            expect(updated.maxAge).toEqual(60);
            expect(updated.realmScope).toEqual('any');
            expect(updated.audience).toEqual(payload.audience);

            await suite.client.clientTokenExchangeCapability.delete(created.id);

            await expectClientError(
                () => suite.client.clientTokenExchangeCapability.getOne(created.id),
                { status: 404, code: ErrorCode.ENTITY_NOT_FOUND },
            );
        });

        it('should list capabilities filtered by client and report the schema', async () => {
            const payload = buildPayload(otherClient.id);

            const { data: created } = await suite.client.clientTokenExchangeCapability.create(payload);

            const { data, meta } = await suite.client.clientTokenExchangeCapability.getMany({ filters: { clientId: otherClient.id } });

            expect(data.map((row) => row.id)).toContain(created.id);
            expect(data.every((row) => row.clientId === otherClient.id)).toBe(true);
            expect(meta.schema).toBeDefined();
        });

        it('should include the client relation', async () => {
            const { data: created } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));

            const { data } = await suite.client.clientTokenExchangeCapability.getMany({
                filters: { id: created.id },
                relations: ['client'],
            });

            expect(data[0].client.id).toEqual(client.id);
        });

        it('should answer the schema route', async () => {
            const response = await suite.client.clientTokenExchangeCapability.getSchema();

            expect(response.data.filters).toBeDefined();
        });
    });

    describe('owner fields', () => {
        it('should take the realm from the client and not the body', async () => {
            const payload = { ...buildPayload(client.id), realmId: otherRealm.id };

            const { data } = await suite.client.clientTokenExchangeCapability.create(payload);

            expect(data.realmId).toEqual(realm.id);
        });

        it('should not move a capability to another client or realm', async () => {
            const { data: created } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));
            const body = {
                clientId: otherClient.id,
                realmId: otherRealm.id,
                maxAge: 120,
            };

            const { data: updated } = await suite.client.clientTokenExchangeCapability.update(created.id, body);

            expect(updated.maxAge).toEqual(120);
            expect(updated.clientId).toEqual(client.id);
            expect(updated.realmId).toEqual(realm.id);
        });

        it('should reject an unknown client', async () => {
            await expectClientError(
                () => suite.client.clientTokenExchangeCapability.create(buildPayload('6f4b5e0a-7f7b-4d43-9b0e-0a2f7a7a0001')),
                { status: 400 },
            );
        });
    });

    describe('uniqueness', () => {
        it('should conflict on the same client and audience', async () => {
            const payload = buildPayload(client.id);

            await suite.client.clientTokenExchangeCapability.create(payload);

            await expectClientError(
                () => suite.client.clientTokenExchangeCapability.create(payload),
                { status: 409, code: ErrorCode.ENTITY_CONFLICT },
            );
        });

        it('should allow the same audience on another client', async () => {
            const audience = nextAudience();

            await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id, audience));

            const { data } = await suite.client.clientTokenExchangeCapability.create(buildPayload(otherClient.id, audience));

            expect(data.audience).toEqual(audience);
        });

        it('should conflict when an update takes an audience in use', async () => {
            const taken = nextAudience();

            await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id, taken));

            const { data: second } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));

            await expectClientError(
                () => suite.client.clientTokenExchangeCapability.update(second.id, { audience: taken }),
                { status: 409, code: ErrorCode.ENTITY_CONFLICT },
            );
        });
    });

    describe('cascade', () => {
        it('should remove the capabilities of a deleted client', async () => {
            const { data: doomed } = await suite.client.client.create(createFakeClient({ realmId: realm.id }));
            const { data: capability } = await suite.client.clientTokenExchangeCapability.create(buildPayload(doomed.id));

            await suite.client.client.delete(doomed.id);

            await expectClientError(
                () => suite.client.clientTokenExchangeCapability.getOne(capability.id),
                { status: 404, code: ErrorCode.ENTITY_NOT_FOUND },
            );
        });
    });

    describe('validation', () => {
        it.each([
            ['an empty audience', { audience: '' }],
            ['an audience with whitespace', { audience: 'a b' }],
            ['an audience too long', { audience: 'a'.repeat(257) }],
            ['no capability type', { value: '' }],
            ['a malformed capability type', { value: 'Bucket' }],
            ['a duplicate capability type', { value: 'bucket bucket' }],
            ['a zero lifetime', { maxAge: 0 }],
            ['a lifetime above the ceiling', { maxAge: 86401 }],
            ['a fractional lifetime', { maxAge: 1.5 }],
            ['an unknown subject realm scope', { realmScope: 'all' }],
        ])('should reject %s', async (_label, patch) => {
            const body = { ...buildPayload(client.id), ...patch } as ReturnType<typeof buildPayload>;

            await expectClientError(
                () => suite.client.clientTokenExchangeCapability.create(body),
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
            const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE);

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
                () => writer.clientTokenExchangeCapability.create({ ...buildPayload(client.id), realmScope: 'any' }),
                { status: 403 },
            );

            const { data } = await writer.clientTokenExchangeCapability.create(buildPayload(client.id));

            expect(data.realmScope).toEqual('own');
        });

        it('should allow an unbounded grant', async () => {
            const writer = await buildWriter(RealmScope.ANY);

            const { data } = await writer.clientTokenExchangeCapability.create({
                ...buildPayload(client.id),
                realmScope: 'any',
            });

            expect(data.realmScope).toEqual('any');
        });
    });

    describe('the authentication of an exchange client is withheld from realm_admin', () => {
        const EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
        const SECRET = 'exchange-client-secret';

        let exchangeClient: Client;
        let plainClient: Client;

        beforeAll(async () => {
            exchangeClient = (await suite.client.client.create({
                ...createFakeClient({ realmId: realm.id }),
                secret: SECRET,
                secretHashed: false,
                secretEncrypted: false,
                grantTypes: EXCHANGE_GRANT,
            })).data;

            await suite.client.clientTokenExchangeCapability.create(buildPayload(exchangeClient.id));

            plainClient = (await suite.client.client.create({
                ...createFakeClient({ realmId: realm.id }),
                secret: SECRET,
                secretHashed: false,
                secretEncrypted: false,
            })).data;
        });

        it('should refuse rotating the secret to one of its choosing', async () => {
            await expectClientError(
                () => realmAdmin.client.rotateSecret(exchangeClient.id, { secret: 'attacker-chosen-secret' }),
                { status: 403 },
            );

            const { data } = await suite.client.client.getOne(exchangeClient.id, { fields: ['+secret'] });

            expect(data.secret).toEqual(SECRET);
        });

        it('should refuse changing how the client authenticates or what it may use', async () => {
            await expectClientError(
                () => realmAdmin.client.update(exchangeClient.id, { grantTypes: 'client_credentials' }),
                { status: 403 },
            );
            await expectClientError(
                () => realmAdmin.client.update(exchangeClient.id, { secret: 'attacker-chosen-secret' }),
                { status: 403 },
            );
        });

        it('should leave the rest of the client editable', async () => {
            const { data } = await realmAdmin.client.update(exchangeClient.id, { description: 'edited by the realm admin' });

            expect(data.description).toEqual('edited by the realm admin');
            expect(data.secret ?? null).toBeNull();
        });

        it('should hide the stored secret and keep showing an ordinary client\'s', async () => {
            const { data: exchange } = await realmAdmin.client.getOne(exchangeClient.id, { fields: ['+secret'] });
            const { data: plain } = await realmAdmin.client.getOne(plainClient.id, { fields: ['+secret'] });

            expect(exchange.secret ?? null).toBeNull();
            expect(plain.secret).toEqual(SECRET);
        });

        it('should hide the secret when only the secret is projected', async () => {
            const { data } = await realmAdmin.client.getOne(exchangeClient.id, { fields: ['id', 'secret'] });

            expect(data.secret ?? null).toBeNull();
        });

        it('should refuse trusting another CA in the realm', async () => {
            await expectClientError(
                () => realmAdmin.trustAnchor.create({
                    name: 'attacker-ca',
                    certificate: readFileSync(new URL('../../../../data/certificates/certificate.pem', import.meta.url), 'utf8'),
                    realmId: realm.id,
                }),
                { status: 403 },
            );
        });

        it('should let a global admin rotate the secret', async () => {
            await expect(suite.client.client.rotateSecret(exchangeClient.id, { secret: 'an-admin-chosen-secret' })).resolves.toBeDefined();
        });
    });

    describe('management is withheld from realm_admin', () => {
        it('should refuse the list', async () => {
            await expectClientError(
                () => realmAdmin.clientTokenExchangeCapability.getMany(),
                { status: 403 },
            );
        });

        it('should refuse the read of a capability of its own realm', async () => {
            const { data: capability } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));

            await expectClientError(
                () => realmAdmin.clientTokenExchangeCapability.getOne(capability.id),
                { status: 403 },
            );
        });

        it('should refuse the create on a client of its own realm', async () => {
            await expectClientError(
                () => realmAdmin.clientTokenExchangeCapability.create(buildPayload(client.id)),
                { status: 403 },
            );
        });

        it('should refuse the update of a capability of its own realm', async () => {
            const { data: capability } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));

            await expectClientError(
                () => realmAdmin.clientTokenExchangeCapability.update(capability.id, { maxAge: 60 }),
                { status: 403 },
            );
        });

        it('should refuse the delete of a capability of its own realm', async () => {
            const { data: capability } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));

            await expectClientError(
                () => realmAdmin.clientTokenExchangeCapability.delete(capability.id),
                { status: 403 },
            );
        });
    });

    describe('realm reach', () => {
        it('should hold an own-reach reader to its own realm', async () => {
            const { data: own } = await suite.client.clientTokenExchangeCapability.create(buildPayload(client.id));
            const { data: foreign } = await suite.client.clientTokenExchangeCapability.create(buildPayload(otherClient.id));

            const { data } = await reader.clientTokenExchangeCapability.getMany({ pagination: { limit: 50 } });

            expect(data.every((row) => row.realmId === realm.id)).toBe(true);

            const { data: read } = await reader.clientTokenExchangeCapability.getOne(own.id);

            expect(read.id).toEqual(own.id);

            await expectClientError(
                () => reader.clientTokenExchangeCapability.getOne(foreign.id),
                { status: 403 },
            );
        });

        it('should refuse a reader the write verbs', async () => {
            await expectClientError(
                () => reader.clientTokenExchangeCapability.create(buildPayload(client.id)),
                { status: 403 },
            );
        });

        it('should refuse an anonymous caller', async () => {
            const anonymous = new HTTPClient({ baseURL: suite.baseURL });

            await expectClientError(
                () => anonymous.clientTokenExchangeCapability.getMany(),
                { status: 401 },
            );
        });
    });
});
