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
import { ScopeName } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import {
    createFakeClient,
    createFakeUser,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('grant-authorize session reuse', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('reuses the bearer session across the interactive login → authorize → token exchange', async () => {
        const password = 'authorize-session-reuse-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const secret = generateOAuth2CodeVerifier();
        const { data: client } = await suite.client
            .client
            .create(createFakeClient({
                secret,
                secretHashed: false,
                secretEncrypted: false,
                authMethod: 'secret',
                tokenBindingMethod: 'none',
            }));
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scopeId: scope.id,
            clientId: client.id,
        });

        // 1) interactive login: password grant creates the (client-less) bearer session
        const login = await suite.client
            .token
            .createWithPassword({ username: user.name, password });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const loginIntrospect = await userClient.token.introspect({ token: login.access_token });
        const userId = loginIntrospect.sub!;
        const loginSessionId = loginIntrospect.session_id!;
        expect(loginSessionId).toBeDefined();

        // 2) that same bearer authorizes the web/confidential client (SSR POST /authorize)
        const authorizeResponse = await userClient
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state: generateOAuth2CodeVerifier(),
            });

        const code = new URL(authorizeResponse.url).searchParams.get('code')!;

        // 3) token exchange — must reuse the login session, not create a second one
        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.id,
                client_secret: secret,
                redirect_uri: 'https://example.com/redirect',
                code,
            });

        expect(tokenResponse.access_token).toBeDefined();

        const exchangeClient = new HTTPClient({ baseURL: suite.baseURL });
        exchangeClient.setAuthorizationHeader({ type: 'Bearer', token: tokenResponse.access_token });
        const exchangeIntrospect = await exchangeClient.token.introspect({ token: tokenResponse.access_token });

        // the exchanged token rides the very same session as the login
        expect(exchangeIntrospect.session_id).toEqual(loginSessionId);

        // 4) exactly ONE session exists for the user — no duplicate on login
        const sessions = await suite.client.session.getMany({ filters: { sub: userId } });
        const own = sessions.data.filter((s) => s.sub === userId);
        expect(own).toHaveLength(1);
        expect(own[0].id).toEqual(loginSessionId);
        // and the reused session now carries the authorizing client
        // The session's `clientId` is the client-SUBJECT foreign key and this
        // session's subject is a user, so it stays null. Which application
        // authorized is on the token rows.
        expect(own[0].clientId).toBeNull();
    });
});
