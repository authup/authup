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
import type { Client } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2ErrorCode } from '@authup/specs';
import {
    createFakeClient, 
    createFakeUser, 
    expectClientError, 
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('token grant_types enforcement', () => {
    const suite = createTestApplication();

    let username : string;
    let password : string;

    beforeAll(async () => {
        await suite.setup();

        const userInput = createFakeUser();
        await suite.client.user.create(userInput);
        username = userInput.name;
        password = userInput.password!;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const createConfidentialClient = (grantTypes: string | null) : Promise<Client> => {
        const input = createFakeClient();
        input.active = true;
        input.auth_method = 'secret';
        input.token_binding_method = 'none';
        input.secret_hashed = false;
        input.secret_encrypted = false;
        input.grant_types = grantTypes;

        return suite.client.client.create(input);
    };

    it('should grant client-credentials when the grant is listed', async () => {
        const entity = await createConfidentialClient('client_credentials');

        const response = await suite.client.token.createWithClientCredentials({
            client_id: entity.id,
            client_secret: entity.secret!,
        });

        expect(response.access_token).toBeDefined();
    });

    it('should grant every grant when grant_types is null', async () => {
        const entity = await createConfidentialClient(null);

        const response = await suite.client.token.createWithClientCredentials({
            client_id: entity.id,
            client_secret: entity.secret!,
        });

        expect(response.access_token).toBeDefined();
    });

    it('should reject client-credentials when the grant is not listed', async () => {
        const entity = await createConfidentialClient('authorization_code refresh_token');

        await expectClientError(
            () => suite.client.token.createWithClientCredentials({
                client_id: entity.id,
                client_secret: entity.secret!,
            }),
            {
                status: 400,
                code: ErrorCode.OAUTH_CLIENT_UNAUTHORIZED,
                data: { error: OAuth2ErrorCode.UNAUTHORIZED_CLIENT },
            },
        );
    });

    it('should reject the password grant for a client not listing it', async () => {
        const entity = await createConfidentialClient('client_credentials');

        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username,
                password,
                client_id: entity.id,
                client_secret: entity.secret!,
            },
        });

        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_CLIENT_UNAUTHORIZED);
        expect(body.error).toEqual(OAuth2ErrorCode.UNAUTHORIZED_CLIENT);
    });

    it('should reject a refresh for a bound client not listing refresh_token', async () => {
        const entity = await createConfidentialClient('password');

        const grantResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username,
                password,
                client_id: entity.id,
                client_secret: entity.secret!,
            },
        });
        expect(grantResponse.status).toEqual(200);
        const grantBody = await grantResponse.json();
        expect(grantBody.refresh_token).toBeDefined();

        const refreshResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: grantBody.refresh_token,
                client_id: entity.id,
                client_secret: entity.secret!,
            },
        });

        expect(refreshResponse.status).toEqual(400);
        const refreshBody = await refreshResponse.json();
        expect(refreshBody.code).toEqual(ErrorCode.OAUTH_CLIENT_UNAUTHORIZED);
        expect(refreshBody.error).toEqual(OAuth2ErrorCode.UNAUTHORIZED_CLIENT);
    });

    it('should refresh when the bound client lists refresh_token', async () => {
        const entity = await createConfidentialClient('password refresh_token');

        const grantResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username,
                password,
                client_id: entity.id,
                client_secret: entity.secret!,
            },
        });
        expect(grantResponse.status).toEqual(200);
        const grantBody = await grantResponse.json();

        const refreshResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: grantBody.refresh_token,
                client_id: entity.id,
                client_secret: entity.secret!,
            },
        });

        expect(refreshResponse.status).toEqual(200);
        const refreshBody = await refreshResponse.json();
        expect(refreshBody.access_token).toBeDefined();
    });
});
