/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
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
    createFakePermission,
    createFakeRealm,
    createFakeRole,
    createFakeScope,
    expectClientError,
} from '../../../../utils';

/**
 * Schema-level `secret` projection gate (issue #3322): the per-row
 * secret authorization applies wherever the CLIENT SCHEMA governs a
 * projection — the `/clients` root and the `fields[client]` positions
 * of client-permission / client-role / client-scope, which are served
 * by other services and never ran `ClientService`'s read gate. Rows
 * are never dropped; an unauthorized plaintext value is redacted.
 *
 * The gate-exercising shape is `fields[client]=id,secret` WITHOUT an
 * explicit include (the dotted field auto-joins the relation with a
 * per-column selection). Under an explicit `include=client` the
 * relation is joined fully-selected and rapiq's #831 dedup drops the
 * per-column selects, so the `select: false` secret never ships there
 * at all — asserted as such below.
 */
describe('http/controllers (client secret projection)', () => {
    const suite = createTestApplication();

    let restrictedActor: HTTPClient;

    let ownClientId: string;
    let foreignClientId: string;
    let foreignHashedClientId: string;

    const ownClientSecret = 'secret-projection-own';
    const foreignClientSecret = 'secret-projection-foreign';
    const foreignHashedSecret = '$2b$10$secret-projection-hash';
    const restrictedActorSecret = 'secret-projection-actor';

    beforeAll(async () => {
        await suite.setup();

        const realmB = await suite.client.realm.create(createFakeRealm());

        const ownClient = await suite.client.client.create({
            ...createFakeClient(),
            secret: ownClientSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        ownClientId = ownClient.id;

        const foreignClient = await suite.client.client.create({
            ...createFakeClient(),
            realmId: realmB.id,
            secret: foreignClientSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        foreignClientId = foreignClient.id;

        const foreignHashedClient = await suite.client.client.create({
            ...createFakeClient(),
            realmId: realmB.id,
            secret: foreignHashedSecret,
            secretHashed: true,
            secretEncrypted: false,
        });
        foreignHashedClientId = foreignHashedClient.id;

        // global relation targets, bindable to clients of any realm
        const permission = await suite.client.permission.create({
            ...createFakePermission(),
            realmId: null,
        });
        const role = await suite.client.role.create({
            ...createFakeRole(),
            realmId: null,
        });
        const scope = await suite.client.scope.create({
            ...createFakeScope(),
            realmId: null,
        });

        for (const clientId of [ownClientId, foreignClientId, foreignHashedClientId]) {
            await suite.client.clientPermission.create({ clientId, permissionId: permission.id });
            await suite.client.clientRole.create({ clientId, roleId: role.id });
            await suite.client.clientScope.create({ clientId, scopeId: scope.id });
        }

        // a restricted actor in master holding the read grants at the
        // default `own` realm scope — its compiled secret gate is
        // conditional on the master realm
        const restrictedClient = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: restrictedActorSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const grantNames = [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_PERMISSION_CREATE,
            PermissionName.CLIENT_ROLE_READ,
        ];
        for (const name of grantNames) {
            const grant = await suite.client.permission.getOne(name);
            await suite.client.clientPermission.create({
                clientId: restrictedClient.id,
                permissionId: grant.id,
            });
        }
        const restrictedToken = await suite.client.token.createWithClientCredentials({
            client_id: restrictedClient.id,
            client_secret: restrictedActorSecret,
        });
        restrictedActor = new HTTPClient({ baseURL: suite.baseURL });
        restrictedActor.setAuthorizationHeader({ type: 'Bearer', token: restrictedToken.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('keeps the root secret projection working for an admin', async () => {
        const response = await suite.client.client.getMany({
            fields: ['+secret'],
            filters: { id: [ownClientId, foreignClientId] },
        });

        expect(response.data).toHaveLength(2);
        const byId = new Map(response.data.map((row) => [row.id, row]));
        expect(byId.get(ownClientId)!.secret).toEqual(ownClientSecret);
        expect(byId.get(foreignClientId)!.secret).toEqual(foreignClientSecret);
    });

    it('redacts a foreign plaintext secret at the root without dropping the row', async () => {
        const response = await restrictedActor.client.getMany({
            fields: ['+secret'],
            filters: { id: [ownClientId, foreignClientId] },
        });

        // both rows keep listing — the gate hides the value, never the row
        expect(response.data).toHaveLength(2);
        const byId = new Map(response.data.map((row) => [row.id, row]));
        expect(byId.get(ownClientId)!.secret).toEqual(ownClientSecret);
        expect(byId.get(foreignClientId)!.secret).toBeUndefined();
    });

    it('redacts a foreign plaintext secret under a bare replace-projection', async () => {
        // `fields=id,secret` REPLACES the default projection — the adapter
        // force-selects the columns the gate condition reads (storage flags,
        // realmId), otherwise the redaction would evaluate against missing
        // columns and fail open
        const response = await restrictedActor.client.getMany({
            fields: ['id', 'secret'],
            filters: { id: [ownClientId, foreignClientId] },
        });

        expect(response.data).toHaveLength(2);
        const byId = new Map(response.data.map((row) => [row.id, row]));
        expect(byId.get(ownClientId)!.secret).toEqual(ownClientSecret);
        expect(byId.get(foreignClientId)!.secret).toBeUndefined();
    });

    it('keeps a foreign HASHED secret visible to a permitted reader', async () => {
        const response = await restrictedActor.client.getMany({
            fields: ['+secret'],
            filters: { id: [foreignHashedClientId] },
        });

        expect(response.data).toHaveLength(1);
        expect(response.data[0].secret).toEqual(foreignHashedSecret);
    });

    it('gates the client-permission fields[client] projection', async () => {
        const response = await restrictedActor.clientPermission.getMany({
            fields: { client: ['id', 'secret'] },
            filters: { clientId: [ownClientId, foreignClientId] },
        });

        // the parent collection is unaffected by the gate
        expect(response.data).toHaveLength(2);
        const byClientId = new Map(response.data.map((row) => [row.clientId, row]));

        const ownRow = byClientId.get(ownClientId)!;
        expect(ownRow.client).toBeDefined();
        expect(ownRow.client!.secret).toEqual(ownClientSecret);

        const foreignRow = byClientId.get(foreignClientId)!;
        expect(foreignRow.client).toBeDefined();
        expect(foreignRow.client!.secret).toBeUndefined();
    });

    it('keeps a hashed secret visible on the client-permission fields[client] projection', async () => {
        const response = await restrictedActor.clientPermission.getMany({
            fields: { client: ['id', 'secret'] },
            filters: { clientId: [foreignHashedClientId] },
        });

        expect(response.data).toHaveLength(1);
        expect(response.data[0].client!.secret).toEqual(foreignHashedSecret);
    });

    it('gates the client-role fields[client] projection', async () => {
        const response = await restrictedActor.clientRole.getMany({
            fields: { client: ['id', 'secret'] },
            filters: { clientId: [ownClientId, foreignClientId] },
        });

        expect(response.data).toHaveLength(2);
        const byClientId = new Map(response.data.map((row) => [row.clientId, row]));
        expect(byClientId.get(ownClientId)!.client!.secret).toEqual(ownClientSecret);
        expect(byClientId.get(foreignClientId)!.client!.secret).toBeUndefined();
    });

    it('gates the client-scope fields[client] projection', async () => {
        const response = await restrictedActor.clientScope.getMany({
            fields: { client: ['id', 'secret'] },
            filters: { clientId: [ownClientId, foreignClientId] },
        });

        expect(response.data).toHaveLength(2);
        const byClientId = new Map(response.data.map((row) => [row.clientId, row]));
        expect(byClientId.get(ownClientId)!.client!.secret).toEqual(ownClientSecret);
        expect(byClientId.get(foreignClientId)!.client!.secret).toBeUndefined();
    });

    it('never ships a secret through an explicit include=client', async () => {
        // under an explicit include the relation joins fully-selected and
        // the per-column fields[client] selects are dropped (rapiq#831 —
        // divergence tracked as rapiq#847), so the select:false secret
        // cannot ship — for anyone. Should the adapter ever reduce
        // explicit-include joins to per-column selections, the schema gate
        // above takes over seamlessly.
        const response = await restrictedActor.clientPermission.getMany({
            relations: ['client'],
            fields: { client: ['id', 'secret'] },
            filters: { clientId: [ownClientId, foreignClientId] },
        });

        expect(response.data).toHaveLength(2);
        for (const row of response.data) {
            expect(row.client).toBeDefined();
            expect(row.client!.secret).toBeUndefined();
        }
    });

    it('denies a foreign single-read secret projection even under a bare replace-projection', async () => {
        // regression: without the operand force-select, a bare
        // `fields=id,secret` stripped realmId and the storage flags from the
        // fetched row, so getOne's post-fetch realm gate neutral-passed and
        // shipped the foreign plaintext secret
        await expectClientError(
            () => restrictedActor.client.getOne(foreignClientId, { fields: ['id', 'secret'] }),
            { status: 403 },
        );
    });
});
