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
import {
    CLIENT_ACCOUNT_CONSOLE_NAME,
    CLIENT_ADMIN_CONSOLE_NAME,
    REALM_MASTER_NAME,
    ScopeName,
} from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import { createFakeClient, createFakeRealm, expectClientError } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/token', () => {
    let payload : OAuth2AuthorizationCodeRequest;

    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();

        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const { data: client } = await suite.client.client.create(createFakeClient());

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

    // Regression (#3347): the per-realm built-in system clients declared
    // their scopes in the `scope` column only and held no auth_client_scopes
    // rows, so the verifier saw an empty granted set. A plain OIDC
    // scope=openid request failed with insufficient_scope; only requests
    // carrying `global` slipped through, via the verifier's bypass.
    it('should authorize a built-in system client with scope=openid alone', async () => {
        const { data: realm } = await suite.client.realm.getOne(REALM_MASTER_NAME);
        const { data: consoleClients } = await suite.client.client.getMany({
            filters: {
                name: CLIENT_ADMIN_CONSOLE_NAME,
                realmId: realm.id,
            },
        });

        expect(consoleClients).toHaveLength(1);

        // the console client is public: PKCE + state are mandatory, and its
        // redirect patterns cover the trusted dev origin
        const response = await suite.client.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: consoleClients[0].id,
            redirect_uri: 'http://localhost:3000/login/callback',
            scope: ScopeName.OPEN_ID,
            state: generateOAuth2CodeVerifier(),
            code_challenge: generateOAuth2CodeVerifier(),
        });

        expect(new URL(response.url).searchParams.get('code')).toBeTruthy();
    });

    // Plan 079: the console authenticates against the per-realm built-in
    // `admin-console` client, addressed exactly like the console does it —
    // name form plus realm hint (a bare name is ambiguous, every realm has
    // one).
    it('should authorize the built-in admin-console client by name and realm hint', async () => {
        const { data: realm } = await suite.client.realm.getOne(REALM_MASTER_NAME);

        const response = await suite.client.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: CLIENT_ADMIN_CONSOLE_NAME,
            realm_id: realm.id,
            redirect_uri: 'http://localhost:3000/login/callback',
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            state: generateOAuth2CodeVerifier(),
            code_challenge: generateOAuth2CodeVerifier(),
        });

        expect(new URL(response.url).searchParams.get('code')).toBeTruthy();
    });

    // Plan 079: creating a realm through the API eagerly provisions its
    // system clients (the startup backfill only covers pre-existing realms).
    it('should provision the system clients for a realm created via the API', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());

        for (const name of [CLIENT_ADMIN_CONSOLE_NAME, CLIENT_ACCOUNT_CONSOLE_NAME]) {
            const { data: clients } = await suite.client.client.getMany({ filters: { name, realmId: realm.id } });

            expect(clients, name).toHaveLength(1);
            expect(clients[0].builtIn).toBe(true);
        }

        // Plan 082: the `web` system client is gone — new realms get none.
        const { data: webClients } = await suite.client.client.getMany({ filters: { name: 'web', realmId: realm.id } });
        expect(webClients).toHaveLength(0);
    });

    it('should NOT advertise implicit/hybrid response types in discovery', async () => {
        const configuration = await fetch(`${suite.baseURL}/realms/master/.well-known/openid-configuration`);
        const body = await configuration.json() as { response_types_supported: string[] };

        expect(body.response_types_supported).toEqual([OAuth2AuthorizationResponseType.CODE]);
    });
});
