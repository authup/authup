/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { ErrorCode } from '@authup/errors';
import { isClientError } from 'hapic';
import { buildOAuth2CodeChallenge, generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { createFakeClient } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('refresh-token', () => {
    let client : Client;

    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();

        client = await suite.client
            .client
            .create(createFakeClient());

        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: client.id,
        });
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should build oauth2 code challenge', async () => {
        const codeVerifier = 'Li5PBcECIXmMuuDsWHjexHnr6LNK6BWKKkcuJaAjeSkeux7p';
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);
        expect(codeChallenge).toEqual('lFtvTpirsB96UMQJgoRhKofsa0w7ShdPkJ3eJ6MgYVY');
    });

    it('should work with authorize grant', async () => {
        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
                state,
            });

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeDefined();
        expect(url.searchParams.get('id_token')).toEqual(null);

        const code = url.searchParams.get('code');

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                redirect_uri: 'https://example.com/redirect',
                code,
            });

        expect(tokenResponse).toBeDefined();
        expect(tokenResponse.access_token).toBeDefined();
        expect(tokenResponse.id_token).toBeDefined();
        expect(tokenResponse.expires_in).toBeDefined();
        expect(tokenResponse.refresh_token).toBeDefined();
    });

    it('should work with authorize grant and PKCE', async () => {
        const state = generateOAuth2CodeVerifier();
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const payload : OAuth2AuthorizationCodeRequest = {
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            code_challenge: codeChallenge,
            state,
        };
        const response = await suite.client
            .authorize
            .confirm(payload);

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        const code = url.searchParams.get('code');

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: codeVerifier,
            });

        expect(tokenResponse).toBeDefined();
        expect(tokenResponse.access_token).toBeDefined();
    });

    it('should not work with authorize grant and invalid PKCE', async () => {
        const state = generateOAuth2CodeVerifier();
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const payload : OAuth2AuthorizationCodeRequest = {
            state,
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            code_challenge: codeChallenge,
        };

        const response = await suite.client
            .authorize
            .confirm(payload);

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        const code = url.searchParams.get('code');

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    redirect_uri: 'https://example.com/redirect',
                    code,
                    code_verifier: generateOAuth2CodeVerifier(),
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response.data).toBeDefined();
                expect(e.response.data.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
            }
        }
    });
});
