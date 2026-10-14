/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Realm, User } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../app/index.ts';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../utils/index.ts';

function basic(username: string, password: string) {
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

/**
 * Issue #3687: a Basic NAME resolves within the route realm on
 * /realms/:realmId/*, a UUID resolves globally, and a flat route is
 * unchanged.
 */
describe('http/middleware/authorization (Basic under a route realm)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.clientAuthBasic = true;
        },
    });

    const sharedName = 'basic-route-realm';
    // user and client Basic both run, so users get a name of their own
    const sharedUserName = 'basic-route-realm-user';
    const secretA = 'secret-realm-a';
    const secretB = 'secret-realm-b';

    let realmA: Realm;
    let realmB: Realm;

    let clientA: Client;
    let clientB: Client;
    let clientOnlyB: Client;

    let userA: User;
    let userB: User;

    async function createClient(realm: Realm, name: string, secret: string) {
        const { data } = await suite.client.client.create({
            ...createFakeClient(),
            name,
            realmId: realm.id,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        return data;
    }

    async function createUser(realm: Realm, password: string) {
        const { data } = await suite.client.user.create({
            ...createFakeUser(),
            name: sharedUserName,
            realmId: realm.id,
            password,
            active: true,
        });

        return data;
    }

    beforeAll(async () => {
        await suite.setup();

        realmA = (await suite.client.realm.create(createFakeRealm())).data;
        realmB = (await suite.client.realm.create(createFakeRealm())).data;

        clientA = await createClient(realmA, sharedName, secretA);
        clientB = await createClient(realmB, sharedName, secretB);
        clientOnlyB = await createClient(realmB, `${sharedName}-only-b`, secretB);

        userA = await createUser(realmA, secretA);
        userB = await createUser(realmB, secretB);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('client', () => {
        it('should resolve a client name within the route realm', async () => {
            let response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/clients/@me`, { headers: { Authorization: basic(sharedName, secretA) } });
            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(clientA.id);

            response = await httpRequest(suite, 'GET', `/realms/${realmB.id}/clients/@me`, { headers: { Authorization: basic(sharedName, secretB) } });
            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(clientB.id);
        });

        it('should not resolve a same-named client of another realm', async () => {
            const response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users`, { headers: { Authorization: basic(sharedName, secretB) } });

            expect(response.status).toEqual(401);
        });

        it('should not resolve a client name of another realm', async () => {
            const response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users`, { headers: { Authorization: basic(clientOnlyB.name, secretB) } });

            expect(response.status).toEqual(401);
        });

        it('should resolve a client uuid globally', async () => {
            const response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/clients/@me`, { headers: { Authorization: basic(clientB.id, secretB) } });

            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(clientB.id);
        });

        it('should keep resolving a client name on a flat route', async () => {
            const response = await httpRequest(suite, 'GET', '/clients/@me', { headers: { Authorization: basic(clientOnlyB.name, secretB) } });

            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(clientOnlyB.id);
        });
    });

    describe('user', () => {
        it('should resolve a user name within the route realm', async () => {
            let response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users/@me`, { headers: { Authorization: basic(sharedUserName, secretA) } });
            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(userA.id);

            response = await httpRequest(suite, 'GET', `/realms/${realmB.id}/users/@me`, { headers: { Authorization: basic(sharedUserName, secretB) } });
            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(userB.id);
        });

        it('should not resolve a same-named user of another realm', async () => {
            const response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users/@me`, { headers: { Authorization: basic(sharedUserName, secretB) } });

            expect(response.status).toEqual(401);
        });

        it('should resolve a user uuid globally', async () => {
            // the own sessions list answers any authenticated user
            const response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/sessions`, { headers: { Authorization: basic(userB.id, secretB) } });

            expect(response.status).toEqual(200);
        });

        it('should fall back to the master realm for a name the route realm lacks', async () => {
            const response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users/${userA.id}`, { headers: { Authorization: basic('admin', 'start123') } });

            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(userA.id);
        });

        it('should fall back to the master realm when the route realm holds the name with another password', async () => {
            const { data: shadow } = await suite.client.user.create({
                ...createFakeUser(),
                name: 'admin',
                realmId: realmA.id,
                password: secretA,
                active: true,
            });

            let response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users/@me`, { headers: { Authorization: basic('admin', secretA) } });
            expect(response.status).toEqual(200);
            expect((await response.json()).data.id).toEqual(shadow.id);

            response = await httpRequest(suite, 'GET', `/realms/${realmA.name}/users/${userA.id}`, { headers: { Authorization: basic('admin', 'start123') } });
            expect(response.status).toEqual(200);
        });
    });
});
