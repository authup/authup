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
import { Client as HTTPClient } from '@authup/core-http-kit';
import { CLIENT_ACCOUNT_CONSOLE_NAME, REALM_MASTER_NAME, ScopeName } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { createFakeUser } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('account-console session continuity (plan 080 work item 0)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('reuses the login session and re-stamps its clientId on the account-console code flow', async () => {
        const { data: realm } = await suite.client.realm.getOne(REALM_MASTER_NAME);
        const { data: clients } = await suite.client.client.getMany({
            filters: {
                name: CLIENT_ACCOUNT_CONSOLE_NAME,
                realmId: realm.id,
            },
        });
        expect(clients).toHaveLength(1);
        const accountClient = clients[0];

        // one of the provisioned `<origin>/**` patterns → a matching
        // account redirect target on that origin.
        const pattern = (accountClient.redirectUri || '').split(',')[0];
        expect(pattern.endsWith('/**')).toBeTruthy();
        const redirectUri = `${pattern.slice(0, -'/**'.length)}/account`;

        const password = 'account-console-session-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        // 1) interactive login on the hosted authorize page: the password
        //    grant creates the (client-less) bearer session
        const login = await suite.client
            .token
            .createWithPassword({ username: user.name, password });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const loginIntrospect = await userClient.token.introspect({ token: login.access_token });
        const userId = loginIntrospect.sub!;
        const loginSessionId = loginIntrospect.session_id!;
        expect(loginSessionId).toBeDefined();

        // 2) the account surface's kick: auth-code + PKCE against the
        //    per-realm public account-console client (builtIn → auto-consent)
        const codeVerifier = generateOAuth2CodeVerifier();
        const authorizeResponse = await userClient
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: accountClient.id,
                redirect_uri: redirectUri,
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
                state: generateOAuth2CodeVerifier(),
                code_challenge: codeVerifier,
            });

        const code = new URL(authorizeResponse.url).searchParams.get('code')!;

        // 3) public-client token exchange (PKCE, no secret)
        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: accountClient.id,
                redirect_uri: redirectUri,
                code,
                code_verifier: codeVerifier,
            });

        expect(tokenResponse.access_token).toBeDefined();

        const exchangeClient = new HTTPClient({ baseURL: suite.baseURL });
        exchangeClient.setAuthorizationHeader({ type: 'Bearer', token: tokenResponse.access_token });
        const exchangeIntrospect = await exchangeClient.token.introspect({ token: tokenResponse.access_token });

        // the exchanged token rides the very same session as the login ...
        expect(exchangeIntrospect.session_id).toEqual(loginSessionId);

        // ... exactly ONE session row exists for the user ...
        const sessions = await suite.client.session.getMany({ filters: { sub: userId } });
        const own = sessions.data.filter((s) => s.sub === userId);
        expect(own).toHaveLength(1);
        expect(own[0].id).toEqual(loginSessionId);

        // ... and the reused row is re-stamped with the account-console
        // client — the per-app session attribution plan 079/080 is built on.
        expect(own[0].clientId).toEqual(accountClient.id);
    });
});
