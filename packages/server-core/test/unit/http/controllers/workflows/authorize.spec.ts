/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type {
    OAuth2TokenPayload,
} from '@authup/specs';
import {
    OAuth2AuthorizationResponseType,
    OAuth2SubKind,
    OAuth2TokenKind,
} from '@authup/specs';
import {
    ScopeName,
} from '@authup/core-kit';
import { extractTokenPayload } from '@authup/server-kit';
import { createFakeClient, createTestSuite } from '../../../../utils';

describe('src/http/controllers/token', () => {
    let payload : OAuth2AuthorizationCodeRequest;

    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();

        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const client = await suite.client.client.create(createFakeClient());

        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: client.id,
        });

        payload = {
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        };
    });

    afterAll(async () => {
        await suite.down();
    });

    it('should authorize with response_type: code', async () => {
        const response = await suite.client
            .authorize
            .confirm({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.CODE}`,
            });

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeDefined();
        expect(url.searchParams.get('id_token')).toBeFalsy();
    });

    it('should authorize with response_type: id_token', async () => {
        const response = await suite.client
            .authorize
            .confirm({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.ID_TOKEN}`,
            });

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeFalsy();
        expect(url.searchParams.get('id_token')).toBeDefined();

        const tokenPayload = extractTokenPayload(url.searchParams.get('id_token')) as OAuth2TokenPayload;
        expect(tokenPayload).toBeDefined();

        expect(tokenPayload.kind).toEqual(OAuth2TokenKind.ID_TOKEN);
        expect(tokenPayload.realm_id).toBeDefined();
        expect(tokenPayload.realm_name).toBeDefined();
        expect(tokenPayload.sub).toBeDefined();
        expect(tokenPayload.sub_kind).toEqual(OAuth2SubKind.USER);

        // verify claims
        expect(tokenPayload.name).toBeDefined();
        expect(tokenPayload.nickname).toBeDefined();
        expect(tokenPayload.email).toBeDefined();
        expect(tokenPayload.email_verified).toBeDefined();
    });

    it('should authorize with response_type: token', async () => {
        const response = await suite.client
            .authorize
            .confirm({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.TOKEN}`,
            });

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.searchParams.get('access_token')).toBeDefined();
        expect(url.searchParams.get('code')).toBeFalsy();
        expect(url.searchParams.get('id_token')).toBeFalsy();

        const tokenPayload = extractTokenPayload(url.searchParams.get('access_token')) as OAuth2TokenPayload;
        expect(tokenPayload).toBeDefined();

        expect(tokenPayload.kind).toEqual(OAuth2TokenKind.ACCESS);
        expect(tokenPayload.realm_id).toBeDefined();
        expect(tokenPayload.realm_name).toBeDefined();
        expect(tokenPayload.sub).toBeDefined();
        expect(tokenPayload.sub_kind).toEqual(OAuth2SubKind.USER);
    });

    it('should authorize with response_type: id_token & token', async () => {
        const response = await suite.client
            .authorize
            .confirm({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.ID_TOKEN} ${OAuth2AuthorizationResponseType.TOKEN}`,
            });

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.searchParams.get('access_token')).toBeDefined();
        expect(url.searchParams.get('code')).toBeFalsy();
        expect(url.searchParams.get('id_token')).toBeDefined();
    });
});
