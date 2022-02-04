/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HTTPOAuth2Client, MASTER_REALM_ID, OAuth2Provider } from '@typescript-auth/domains';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';
import { useConfig } from '../../../../src';

describe('src/http/controllers/oauth2-provider', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<OAuth2Provider> = {
        name: 'keycloak',
        authorize_path: '/protocol/openid-connect/auth',
        client_id: 'pht',
        client_secret: 'start123',
        open_id: true,
        token_host: 'https://keycloak-pht.tada5hi.net/auth/realms/master/',
        token_path: '/protocol/openid-connect/token',
        realm_id: MASTER_REALM_ID,
    };

    it('should read collection', async () => {
        const response = await superTest
            .get('/oauth2-providers')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(0);
    });

    it('should create, read, update, delete resource', async () => {
        let response = await superTest
            .post('/oauth2-providers')
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
            .get(`/oauth2-providers/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        details.name = 'TestA';

        response = await superTest
            .post(`/oauth2-providers/${response.body.id}`)
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
            .delete(`/oauth2-providers/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
    });

    it('should build authorize url', async () => {
        let response = await superTest
            .post('/oauth2-providers')
            .send(details)
            .auth('admin', 'start123');

        const provider = response.body;

        response = await superTest
            .get(`/oauth2-providers/${response.body.id}/authorize-url`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(302);
        expect(response.header.location).toBeDefined();

        const config = useConfig();

        const oauth2Client = new HTTPOAuth2Client({
            client_id: provider.client_id,
            token_host: provider.token_host,
            authorize_host: provider.authorize_host,
            authorize_path: provider.authorize_path,
            redirect_uri: `${config.selfUrl}/oauth2-providers/${provider.id}/authorize-callback`,
        });

        expect(response.header.location).toEqual(oauth2Client.buildAuthorizeURL());
    });
});
