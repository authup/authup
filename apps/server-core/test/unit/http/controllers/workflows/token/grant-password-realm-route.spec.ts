/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

function decodePayload(token: string) : Record<string, any> {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
}

describe('src/http/controllers/token (realm route)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with password against the realm route', async () => {
        const response = await httpRequest(suite, 'POST', '/realms/master/token', {
            form: {
                grant_type: 'password',
                username: 'admin',
                password: 'start123',
            },
        });

        expect(response.status).toEqual(200);
        const body = await response.json();
        expect(decodePayload(body.access_token).realm_name).toEqual('master');
    });

    it('should let the route realm win over a body realm hint', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: user } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password: 'realm-route-secret',
        }));

        let response = await httpRequest(suite, 'POST', `/realms/${realm.name}/token`, {
            form: {
                grant_type: 'password',
                username: user.name,
                password: 'realm-route-secret',
                realm_name: 'master',
            },
        });

        expect(response.status).toEqual(200);
        let body = await response.json();
        expect(decodePayload(body.access_token).realm_id).toEqual(realm.id);

        response = await httpRequest(suite, 'POST', '/realms/master/token', {
            form: {
                grant_type: 'password',
                username: 'admin',
                password: 'start123',
                realm_name: realm.name,
            },
        });

        expect(response.status).toEqual(200);
        body = await response.json();
        expect(decodePayload(body.access_token).realm_name).toEqual('master');
    });

    it('should answer 404 for an unknown route realm', async () => {
        const response = await httpRequest(suite, 'POST', '/realms/unknown-realm-route/token', {
            form: {
                grant_type: 'password',
                username: 'admin',
                password: 'start123',
            },
        });

        expect(response.status).toEqual(404);
    });

    it('should answer 404 for an unknown route realm id instead of falling back to master', async () => {
        const response = await httpRequest(suite, 'POST', '/realms/00000000-0000-4000-8000-000000000000/token', {
            form: {
                grant_type: 'password',
                username: 'admin',
                password: 'start123',
            },
        });

        expect(response.status).toEqual(404);
    });

    it('should refuse a body that cannot carry the route realm', async () => {
        const response = await httpRequest(suite, 'POST', '/realms/master/token?grant_type=authorization_code&code=unknown', {
            headers: { 'Content-Type': 'application/json' },
            body: '[]',
        });

        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.message).toEqual('The request body must be an object.');
    });

    it('should resolve a client name in the route realm for client credentials and introspection', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());

        const input = createFakeClient();
        input.active = true;
        input.authMethod = 'secret';
        input.tokenBindingMethod = 'none';
        input.secretHashed = false;
        input.secretEncrypted = false;
        input.realmId = realm.id;
        const { data: client } = await suite.client.client.create(input);

        let response = await httpRequest(suite, 'POST', `/realms/${realm.name}/token`, {
            form: {
                grant_type: 'client_credentials',
                client_id: client.name,
                client_secret: client.secret!,
                realm_name: 'master',
            },
        });

        expect(response.status).toEqual(200);
        const { access_token: token } = await response.json();
        expect(decodePayload(token).realm_id).toEqual(realm.id);

        response = await httpRequest(suite, 'POST', `/realms/${realm.name}/token/introspect`, {
            form: {
                token,
                client_id: client.name,
                client_secret: client.secret!,
                realm_name: 'master',
            },
        });

        expect(response.status).toEqual(200);
        const introspection = await response.json();
        expect(introspection.active).toEqual(true);
    });

    it('should answer 404 on revoke for an unknown route realm id', async () => {
        const response = await httpRequest(suite, 'POST', '/realms/00000000-0000-4000-8000-000000000000/token/revoke', { form: { token: 'unknown' } });

        expect(response.status).toEqual(404);
    });
});
