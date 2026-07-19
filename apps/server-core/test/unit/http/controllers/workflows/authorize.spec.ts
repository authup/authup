/*
 * Copyright (c) 2023-2024.
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
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { createFakeClient, expectClientError } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/token', () => {
    let payload : OAuth2AuthorizationCodeRequest;

    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();

        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const client = await suite.client.client.create(createFakeClient());

        await suite.client.clientScope.create({
            scopeId: scope.id,
            clientId: client.id,
        });

        payload = {
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        };
    });

    afterAll(async () => {
        await suite.teardown();
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

    // OAuth 2.1 posture: the authorization endpoint issues codes only — the
    // implicit/hybrid response types were dropped (plan 042 item 3). Tokens in
    // the redirect URL leaked via history, proxy logs, and Referer.
    it.each([
        [`${OAuth2AuthorizationResponseType.ID_TOKEN}`],
        [`${OAuth2AuthorizationResponseType.TOKEN}`],
        [`${OAuth2AuthorizationResponseType.ID_TOKEN} ${OAuth2AuthorizationResponseType.TOKEN}`],
        [`${OAuth2AuthorizationResponseType.CODE} ${OAuth2AuthorizationResponseType.TOKEN}`],
        [`${OAuth2AuthorizationResponseType.NONE}`],
    ])('should reject the dropped response_type: %s', async (responseType) => {
        await expectClientError(
            () => suite.client.authorize.confirm({
                ...payload,
                response_type: responseType,
            }),
            { status: 400 },
        );
    });

    it('should reject an unknown response_type with a response_type issue', async () => {
        expect.assertions(2);
        try {
            await suite.client.authorize.confirm({
                ...payload,
                response_type: 'garbage',
            });
        } catch (e) {
            const { response } = (e as { response?: { status?: number, data?: { issues?: { path: string[] }[] } } });
            expect(response?.status).toEqual(400);
            expect(response?.data?.issues?.some(
                (issue) => issue.path.includes('response_type'),
            )).toBe(true);
        }
    });

    it('should NOT advertise implicit/hybrid response types in discovery', async () => {
        const configuration = await fetch(`${suite.baseURL}/realms/master/.well-known/openid-configuration`);
        const body = await configuration.json() as { response_types_supported: string[] };

        expect(body.response_types_supported).toEqual([OAuth2AuthorizationResponseType.CODE]);
    });
});
