/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IdentityProviderProtocol,
    OAuth2IdentityProvider,
    buildIdentityProviderAuthorizePath,
} from '@authup/common';
import { Client } from '@hapic/oauth2';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';
import { useConfig } from '../../../../src';

describe('src/http/controllers/identity-provider', () => {
    let superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    const details : Partial<OAuth2IdentityProvider> = {
        name: 'keycloak',
        slug: 'keycloak',
        enabled: true,
        protocol: IdentityProviderProtocol.OAUTH2,
        client_id: 'client',
        client_secret: 'start123',
        token_url: 'https://keycloak-pht.tada5hi.net/auth/realms/master/protocol/openid-connect/token',
        authorize_url: 'https://keycloak-pht.tada5hi.net/auth/realms/master/protocol/openid-connect/auth',
    };

    it('should create resource', async () => {
        const response = await superTest
            .post('/identity-providers')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        details.id = response.body.id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/identity-providers')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(1);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/identity-providers/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should read resource by slug', async () => {
        const response = await superTest
            .get(`/identity-providers/${details.slug}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should update resource', async () => {
        details.name = 'TestA';
        details.client_secret = 'start1234';

        const response = await superTest
            .post(`/identity-providers/${details.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should build authorize url', async () => {
        const response = await superTest
            .get(buildIdentityProviderAuthorizePath(details.id))
            .auth('admin', 'start123');

        expect(response.status).toEqual(302);
        expect(response.header.location).toBeDefined();

        const config = await useConfig();

        const identityClient = new Client({
            options: {
                client_id: details.client_id,
                authorization_endpoint: details.authorize_url,
                redirect_uri: `${config.get('publicUrl')}/identity-providers/${details.id}/authorize-callback`,
            },
        });

        expect(response.header.location).toEqual(identityClient.authorize.buildURL());
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/identity-providers/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
