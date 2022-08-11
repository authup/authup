/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IdentityProviderProtocol,
    MASTER_REALM_ID,
    OAuth2IdentityProvider,
    buildIdentityProviderAuthorizePath,
} from '@authelion/common';
import { Client } from '@hapic/oauth2';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';
import { useConfig } from '../../../../src';

describe('src/http/controllers/identity-provider', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<OAuth2IdentityProvider> = {
        name: 'keycloak',
        sub: 'keycloak',
        enabled: true,
        protocol: IdentityProviderProtocol.OAUTH2,
        client_id: 'client',
        client_secret: 'start123',
        token_url: 'https://keycloak-pht.tada5hi.net/auth/realms/master/protocol/openid-connect/token',
        authorize_url: 'https://keycloak-pht.tada5hi.net/auth/realms/master/protocol/openid-connect/auth',
        realm_id: MASTER_REALM_ID,
    };

    it('should read collection', async () => {
        const response = await superTest
            .get('/identity-providers')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(0);
    });

    it('should create, read, update, delete resource', async () => {
        let response = await superTest
            .post('/identity-providers')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        let keys : string[] = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .get(`/identity-providers/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        details.name = 'TestA';
        details.client_secret = 'start1234';

        response = await superTest
            .post(`/identity-providers/${response.body.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        keys = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .delete(`/identity-providers/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
    });

    it('should build authorize url', async () => {
        let response = await superTest
            .post('/identity-providers')
            .send(details)
            .auth('admin', 'start123');

        const provider : OAuth2IdentityProvider = response.body;

        response = await superTest
            .get(buildIdentityProviderAuthorizePath(provider.id))
            .auth('admin', 'start123');

        expect(response.status).toEqual(302);
        expect(response.header.location).toBeDefined();

        const config = await useConfig();

        const identityClient = new Client({
            options: {
                client_id: provider.client_id,
                authorization_endpoint: provider.authorize_url,
                redirect_uri: `${config.selfUrl}/identity-providers/${provider.id}/authorize-callback`,
            },
        });

        expect(response.header.location).toEqual(identityClient.authorize.buildURL());
    });
});
