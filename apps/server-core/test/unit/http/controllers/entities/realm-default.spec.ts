/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName, ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
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
    createFakeOAuth2IdentityProvider,
    createFakePermission,
    createFakeRole,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';

/**
 * On create, an absent `realmId` and `realmId: null` mean the same thing:
 * a global row for the global-capable entities, the actor's realm for the
 * realm-bound ones.
 */
describe('http/controllers/entities/realm-default', () => {
    const suite = createTestApplication();

    const knownSecret = 'realm-default-secret-123';
    let masterRealmId: string;
    let restricted: HTTPClient;

    beforeAll(async () => {
        await suite.setup();

        const { data: actorClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: knownSecret,
            secretHashed: false,
            secretEncrypted: false,
        });

        masterRealmId = actorClient.realmId;

        const { data: permission } = await suite.client.permission.getOne(PermissionName.ROLE_CREATE);

        await suite.client.clientPermission.create({ clientId: actorClient.id, permissionId: permission.id });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: knownSecret,
        });

        restricted = new HTTPClient({ baseURL: suite.baseURL });
        restricted.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createAsAdmin(path: string, data: Record<string, any>) {
        const response = await httpRequest(suite, 'POST', path, {
            headers: {
                Authorization: `Basic ${Buffer.from('admin:start123').toBase64()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        expect(response.status).toEqual(201);

        const { data: entity } = await response.json();

        return entity;
    }

    it('should create a global permission when an admin omits realmId', async () => {
        const { data } = await suite.client.permission.create(createFakePermission());

        expect(data.realmId).toBeNull();
    });

    it('should create a global permission when an admin sends realmId: null', async () => {
        const { data } = await suite.client.permission.create({ ...createFakePermission(), realmId: null });

        expect(data.realmId).toBeNull();
    });

    it('should refuse a restricted actor creating a role without realmId', async () => {
        await expectClientError(
            () => restricted.role.create(createFakeRole()),
            { status: 403 },
        );
    });

    it('should create a role in its own realm when a restricted actor sends it', async () => {
        const { data } = await restricted.role.create(createFakeRole({ realmId: masterRealmId }));

        expect(data.realmId).toEqual(masterRealmId);
    });

    it('should create a user in the actor realm when an admin omits realmId', async () => {
        const { data } = await suite.client.user.create(createFakeUser());

        expect(data.realmId).toEqual(masterRealmId);
    });

    it('should create a client in the actor realm when an admin omits realmId', async () => {
        const { data } = await suite.client.client.create(createFakeClient());

        expect(data.realmId).toEqual(masterRealmId);
    });

    it('should create a user in the actor realm when an admin sends realmId: null', async () => {
        const entity = await createAsAdmin('/users', { ...createFakeUser(), realmId: null });

        expect(entity.realmId).toEqual(masterRealmId);
    });

    it('should create a client in the actor realm when an admin sends realmId: null', async () => {
        const entity = await createAsAdmin('/clients', { ...createFakeClient(), realmId: null });

        expect(entity.realmId).toEqual(masterRealmId);
    });

    it('should create a path in the actor realm when an admin sends realmId: null', async () => {
        const entity = await createAsAdmin('/paths', { name: 'realm-default-null', realmId: null });

        expect(entity.realmId).toEqual(masterRealmId);
    });

    it('should create an identity provider in the actor realm when an admin sends realmId: null', async () => {
        const entity = await createAsAdmin('/identity-providers', {
            ...createFakeOAuth2IdentityProvider(),
            realmId: null,
        });

        expect(entity.realmId).toEqual(masterRealmId);
    });

    describe('name-keyed upsert', () => {
        let otherRealmId: string;
        let scopedRoleId: string;

        beforeAll(async () => {
            const { data: realm } = await suite.client.realm.create({ name: 'realm-default-other' });

            otherRealmId = realm.id;
        });

        it('should update the global role when realmId is absent', async () => {
            const { data: scoped } = await suite.client.role.create({ name: 'dup-x', realmId: otherRealmId });
            const { data: global } = await suite.client.role.create({ name: 'dup-x', realmId: null });

            scopedRoleId = scoped.id;

            const { data } = await suite.client.role.createOrUpdate('dup-x', { name: 'dup-x', description: 'changed' });

            expect(data.id).toEqual(global.id);
            expect(data.realmId).toBeNull();

            const { data: unchanged } = await suite.client.role.getOne(scoped.id);

            expect(unchanged.realmId).toEqual(otherRealmId);
            expect(unchanged.description).not.toEqual('changed');
        });

        it('should create a global role instead of updating a realm role of that name', async () => {
            const { data: scoped } = await suite.client.role.create({ name: 'dup-y', realmId: otherRealmId });

            const { data } = await suite.client.role.createOrUpdate('dup-y', { name: 'dup-y', description: 'changed' });

            expect(data.id).not.toEqual(scoped.id);
            expect(data.realmId).toBeNull();

            const { data: unchanged } = await suite.client.role.getOne(scoped.id);

            expect(unchanged.description).not.toEqual('changed');
        });

        it('should update the realm role when realmId is given', async () => {
            const { data } = await suite.client.role.update('dup-x', {
                name: 'dup-x',
                description: 'realm-changed',
                realmId: otherRealmId,
            });

            expect(data.id).toEqual(scopedRoleId);
            expect(data.description).toEqual('realm-changed');
        });

        it('should keep the unchanged name of a realm role when a global role shares it', async () => {
            await suite.client.role.create({ name: 'dup-u', realmId: null });

            const { data: scoped } = await suite.client.role.create({ name: 'dup-u', realmId: otherRealmId });

            const { data: byId } = await suite.client.role.update(scoped.id, {
                name: 'dup-u',
                description: 'by-id',
            });

            expect(byId.id).toEqual(scoped.id);
            expect(byId.realmId).toEqual(otherRealmId);
            expect(byId.description).toEqual('by-id');

            const { data: byName } = await suite.client.role.update('dup-u', {
                name: 'dup-u',
                description: 'by-name',
                realmId: otherRealmId,
            });

            expect(byName.id).toEqual(scoped.id);
            expect(byName.description).toEqual('by-name');
        });

        it('should refuse renaming a realm role onto a name its realm holds', async () => {
            await suite.client.role.create({ name: 'dup-v', realmId: otherRealmId });

            const { data: scoped } = await suite.client.role.create({ name: 'dup-w', realmId: otherRealmId });

            await expectClientError(
                () => suite.client.role.update(scoped.id, { name: 'dup-v' }),
                { status: 409 },
            );
        });

        it('should keep the unchanged name of a realm permission when a global permission shares it', async () => {
            await suite.client.permission.create({ name: 'dup-u', realmId: null });

            const { data: scoped } = await suite.client.permission.create({ name: 'dup-u', realmId: otherRealmId });

            const { data } = await suite.client.permission.update(scoped.id, {
                name: 'dup-u',
                description: 'by-id',
            });

            expect(data.id).toEqual(scoped.id);
            expect(data.description).toEqual('by-id');
        });

        it('should keep the unchanged name of a realm scope when a global scope shares it', async () => {
            await suite.client.scope.create({ name: 'dup-u', realmId: null });

            const { data: scoped } = await suite.client.scope.create({ name: 'dup-u', realmId: otherRealmId });

            const { data } = await suite.client.scope.update(scoped.id, {
                name: 'dup-u',
                description: 'by-id',
            });

            expect(data.id).toEqual(scoped.id);
            expect(data.description).toEqual('by-id');
        });

        it('should update the global permission when realmId is absent', async () => {
            const { data: scoped } = await suite.client.permission.create({ name: 'dup-x', realmId: otherRealmId });
            const { data: global } = await suite.client.permission.create({ name: 'dup-x', realmId: null });

            const { data } = await suite.client.permission.createOrUpdate('dup-x', { name: 'dup-x', description: 'changed' });

            expect(data.id).toEqual(global.id);
            expect(data.realmId).toBeNull();

            const { data: unchanged } = await suite.client.permission.getOne(scoped.id);

            expect(unchanged.realmId).toEqual(otherRealmId);
            expect(unchanged.description).not.toEqual('changed');
        });

        it('should address the role owned by the clientId the body names', async () => {
            const { data: client } = await suite.client.client.create({
                ...createFakeClient(),
                realmId: otherRealmId,
            });
            const { data: owned } = await suite.client.role.create({
                name: 'dup-o',
                realmId: otherRealmId,
                clientId: client.id,
            });

            const { data: unowned } = await suite.client.role.createOrUpdate('dup-o', {
                name: 'dup-o',
                description: 'unowned',
                realmId: otherRealmId,
            });

            expect(unowned.id).not.toEqual(owned.id);
            expect(unowned.clientId).toBeNull();
            expect(unowned.realmId).toEqual(otherRealmId);

            const { data: ownedUpdate } = await suite.client.role.createOrUpdate('dup-o', {
                name: 'dup-o',
                description: 'owned',
                realmId: otherRealmId,
                clientId: client.id,
            });

            expect(ownedUpdate.id).toEqual(owned.id);
            expect(ownedUpdate.description).toEqual('owned');

            const { data: unownedAgain } = await suite.client.role.getOne(unowned.id);

            expect(unownedAgain.description).toEqual('unowned');
        });

        it('should update the client-owned role a name-keyed update addresses', async () => {
            const { data: client } = await suite.client.client.create({
                ...createFakeClient(),
                realmId: otherRealmId,
            });
            const { data: owned } = await suite.client.role.create({
                name: 'reader',
                realmId: otherRealmId,
                clientId: client.id,
            });

            const { data } = await suite.client.role.update('reader', {
                realmId: otherRealmId,
                clientId: client.id,
                displayName: 'reader-x',
            });

            expect(data.id).toEqual(owned.id);
            expect(data.displayName).toEqual('reader-x');
            expect(data.clientId).toEqual(client.id);
            expect(data.realmId).toEqual(otherRealmId);
        });

        it('should refuse a realm key that does not resolve', async () => {
            await expectClientError(
                () => suite.client.role.update('dup-x', { description: 'x', realmId: 'realm-default-unknown' }),
                { status: 400 },
            );

            await expectClientError(
                () => suite.client.role.createOrUpdate('dup-x', { name: 'dup-x', realmId: randomUUID() }),
                { status: 400 },
            );
        });
    });

    describe('realm-bound name keys', () => {
        it('should not address a user of another realm through a realm key that does not resolve', async () => {
            const { data: realm } = await suite.client.realm.create({ name: 'realm-default-users' });
            const { data: user } = await suite.client.user.create({
                ...createFakeUser(),
                name: 'realm-default-scoped-user',
                realmId: realm.id,
            });

            const unknownRealmId = randomUUID();

            await expectClientError(
                () => suite.client.user.update('realm-default-scoped-user', {
                    displayName: 'hijacked',
                    realmId: unknownRealmId,
                }),
                { status: 400 },
            );

            await expectClientError(
                () => suite.client.user.createOrUpdate('realm-default-scoped-user', {
                    name: 'realm-default-scoped-user',
                    email: 'realm-default-scoped-user@example.com',
                    displayName: 'hijacked',
                    realmId: unknownRealmId,
                }),
                { status: 400 },
            );

            const { data: unchanged } = await suite.client.user.getOne(user.id);

            expect(unchanged.displayName).not.toEqual('hijacked');
        });

        describe('without realmId', () => {
            let otherRealmId: string;

            beforeAll(async () => {
                const { data: realm } = await suite.client.realm.create({ name: 'realm-default-bound' });

                otherRealmId = realm.id;
            });

            it('should create the user in the actor realm instead of updating one of another realm', async () => {
                const { data: foreign } = await suite.client.user.create({
                    ...createFakeUser(),
                    name: 'realm-default-alice',
                    realmId: otherRealmId,
                });

                const { data } = await suite.client.user.createOrUpdate('realm-default-alice', {
                    name: 'realm-default-alice',
                    email: 'realm-default-alice@example.com',
                    displayName: 'master-alice',
                });

                expect(data.id).not.toEqual(foreign.id);
                expect(data.realmId).toEqual(masterRealmId);

                const { data: unchanged } = await suite.client.user.getOne(foreign.id);

                expect(unchanged.realmId).toEqual(otherRealmId);
                expect(unchanged.displayName).not.toEqual('master-alice');
            });

            it('should not update a user of another realm by name', async () => {
                await suite.client.user.create({
                    ...createFakeUser(),
                    name: 'realm-default-bob',
                    realmId: otherRealmId,
                });

                await expectClientError(
                    () => suite.client.user.update('realm-default-bob', { displayName: 'changed' }),
                    { status: 404 },
                );
            });

            it('should create the client in the actor realm instead of updating one of another realm', async () => {
                const { data: foreign } = await suite.client.client.create({
                    ...createFakeClient(),
                    name: 'realm-default-app',
                    realmId: otherRealmId,
                });

                const { data } = await suite.client.client.createOrUpdate('realm-default-app', {
                    name: 'realm-default-app',
                    displayName: 'master-app',
                });

                expect(data.id).not.toEqual(foreign.id);
                expect(data.realmId).toEqual(masterRealmId);

                const { data: unchanged } = await suite.client.client.getOne(foreign.id);

                expect(unchanged.realmId).toEqual(otherRealmId);
                expect(unchanged.displayName).not.toEqual('master-app');
            });

            it('should create the identity provider in the actor realm instead of updating one of another realm', async () => {
                const { data: foreign } = await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
                    name: 'realm-default-idp',
                    realmId: otherRealmId,
                }));

                const { data } = await suite.client.identityProvider.createOrUpdate(
                    'realm-default-idp',
                    createFakeOAuth2IdentityProvider({
                        name: 'realm-default-idp',
                        displayName: 'master-idp',
                    }),
                );

                expect(data.id).not.toEqual(foreign.id);
                expect(data.realmId).toEqual(masterRealmId);

                const { data: unchanged } = await suite.client.identityProvider.getOne(foreign.id);

                expect(unchanged.realmId).toEqual(otherRealmId);
                expect(unchanged.displayName).not.toEqual('master-idp');
            });

            it('should update a user and a client of another realm by id', async () => {
                const { data: user } = await suite.client.user.create({ ...createFakeUser(), realmId: otherRealmId });
                const { data: client } = await suite.client.client.create({ ...createFakeClient(), realmId: otherRealmId });

                const { data: updatedUser } = await suite.client.user.update(user.id, { displayName: 'by-id' });

                expect(updatedUser.displayName).toEqual('by-id');
                expect(updatedUser.realmId).toEqual(otherRealmId);

                const { data: updatedClient } = await suite.client.client.update(client.id, { displayName: 'by-id' });

                expect(updatedClient.displayName).toEqual('by-id');
                expect(updatedClient.realmId).toEqual(otherRealmId);
            });
        });
    });

    describe('owning client', () => {
        let clientRealmId: string;
        let clientId: string;

        beforeAll(async () => {
            const { data: realm } = await suite.client.realm.create({ name: 'realm-default-owner' });

            clientRealmId = realm.id;

            const { data: client } = await suite.client.client.create({ ...createFakeClient(), realmId: clientRealmId });

            clientId = client.id;
        });

        it('should create a permission in the client realm when realmId is absent', async () => {
            const { data } = await suite.client.permission.create({ ...createFakePermission(), clientId });

            expect(data.realmId).toEqual(clientRealmId);
        });

        it('should create a role in the client realm when realmId is null', async () => {
            const entity = await createAsAdmin('/roles', {
                ...createFakeRole(),
                clientId,
                realmId: null,
            });

            expect(entity.realmId).toEqual(clientRealmId);
        });

        it('should refuse a realm other than the client realm', async () => {
            await expectClientError(
                () => suite.client.permission.create({
                    ...createFakePermission(),
                    clientId,
                    realmId: masterRealmId,
                }),
                { status: 400 },
            );
        });

        describe('realm admin of another realm', () => {
            let realmAdmin: HTTPClient;
            let realmAdminRealmId: string;

            beforeAll(async () => {
                const { data: realm } = await suite.client.realm.create({ name: 'realm-default-admin' });

                realmAdminRealmId = realm.id;

                const password = 'realm-default-realm-admin-pw';
                const { data: user } = await suite.client.user.create(
                    createFakeUser({ realmId: realm.id, password }),
                );
                const { data: role } = await suite.client.role.getOne(ROLE_REALM_ADMIN_NAME);

                await suite.client.userRole.create({ userId: user.id, roleId: role.id });

                const token = await suite.client.token.createWithPassword({
                    username: user.name,
                    password,
                    realm_id: realm.id,
                });

                realmAdmin = new HTTPClient({ baseURL: suite.baseURL });
                realmAdmin.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
            });

            it('should refuse a role owned by a client of another realm with 403', async () => {
                for (const realmId of [realmAdminRealmId, clientRealmId]) {
                    await expectClientError(
                        () => realmAdmin.role.create({
                            ...createFakeRole(),
                            clientId,
                            realmId,
                        }),
                        { status: 403 },
                    );
                }
            });

            it('should refuse a permission owned by a client of another realm with 403', async () => {
                for (const realmId of [realmAdminRealmId, clientRealmId]) {
                    await expectClientError(
                        () => realmAdmin.permission.create({
                            ...createFakePermission(),
                            clientId,
                            realmId,
                        }),
                        { status: 403 },
                    );
                }
            });
        });

        it('should address the client-owned permission by name when realmId is absent', async () => {
            const { data: owned } = await suite.client.permission.create({ name: 'dup-owned', clientId });

            const { data } = await suite.client.permission.createOrUpdate('dup-owned', {
                name: 'dup-owned',
                clientId,
                description: 'owned-changed',
            });

            expect(data.id).toEqual(owned.id);
            expect(data.description).toEqual('owned-changed');
        });
    });
});
