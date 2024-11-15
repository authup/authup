/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { ErrorCode, OAuth2AuthorizationResponseType } from '@authup/kit';
import { buildOauth2CodeChallenge, generateOAuth2CodeVerifier } from '../../../../../src';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import { createSuperTestClientWithScope } from '../../../../utils/domains';
import type { TestAgent } from '../../../../utils/supertest';
import { useSuperTest } from '../../../../utils/supertest';

describe('refresh-token', () => {
    let superTest: TestAgent;
    let client : Client;

    beforeAll(async () => {
        superTest = useSuperTest();
        await useTestDatabase();

        const { body } = await createSuperTestClientWithScope(superTest);
        client = body;
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should work with authorize grant', async () => {
        let response = await superTest
            .post('/authorize')
            .send({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            })
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeDefined();
        expect(url.searchParams.get('id_token')).toBeDefined();

        const code = url.searchParams.get('code');

        response = await superTest
            .post('/token')
            .send({
                grant_type: 'authorization_code',
                redirect_uri: 'https://example.com/redirect',
                code,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.id_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
    });

    it('should work with authorize grant and PKCE', async () => {
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = buildOauth2CodeChallenge(codeVerifier);

        const payload : OAuth2AuthorizationCodeRequest = {
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            code_challenge: codeChallenge,
        };
        let response = await superTest
            .post('/authorize')
            .send(payload)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        const code = url.searchParams.get('code');

        response = await superTest
            .post('/token')
            .send({
                grant_type: 'authorization_code',
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: codeVerifier,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
    });

    it('should not work with authorize grant and invalid PKCE', async () => {
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = buildOauth2CodeChallenge(codeVerifier);

        const payload : OAuth2AuthorizationCodeRequest = {
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            code_challenge: codeChallenge,
        };
        let response = await superTest
            .post('/authorize')
            .send(payload)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        const code = url.searchParams.get('code');

        response = await superTest
            .post('/token')
            .send({
                grant_type: 'authorization_code',
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: generateOAuth2CodeVerifier(),
            });

        expect(response.status).toEqual(400);
        expect(response.body).toBeDefined();
        expect(response.body.code).toEqual(ErrorCode.TOKEN_GRANT_INVALID);
    });
});
