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
import type { Client } from '@authup/core-kit';
import {
    CLIENT_ACCOUNT_CONSOLE_NAME,
    CLIENT_ADMIN_CONSOLE_NAME,
    REALM_MASTER_NAME,
    ScopeName,
} from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2AuthorizationPrompt, OAuth2AuthorizationResponseType } from '@authup/specs';
import { SessionTokenEntity } from '../../../../../../src/adapters/database/domains/index.ts';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { createFakeUser } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

type SystemClient = {
    entity: Client,
    origin: string,
};

function decodeJwtPayload(token: string): OAuth2TokenPayload {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
}

describe('account-console session continuity (plan 080 work item 0)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function resolveSystemClient(name: string): Promise<SystemClient> {
        const { data: realm } = await suite.client.realm.getOne(REALM_MASTER_NAME);
        const { data: clients } = await suite.client.client.getMany({
            filters: {
                name,
                realmId: realm.id,
            },
        });
        expect(clients).toHaveLength(1);

        // one of the provisioned `<origin>/**` patterns → a matching
        // redirect target on that origin.
        const pattern = (clients[0].redirectUri || '').split(',')[0];
        expect(pattern.endsWith('/**')).toBeTruthy();

        return {
            entity: clients[0],
            origin: pattern.slice(0, -'/**'.length),
        };
    }

    /**
     * The console code flow: auth-code + PKCE against a per-realm public
     * system client (builtIn, so consent is automatic).
     */
    async function authorizeAndExchange(
        bearer: HTTPClient,
        client: SystemClient,
        path: string,
        prompt?: `${OAuth2AuthorizationPrompt}`,
    ) {
        const redirectUri = `${client.origin}${path}`;
        const codeVerifier = generateOAuth2CodeVerifier();

        const authorizeResponse = await bearer
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.entity.id,
                redirect_uri: redirectUri,
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
                state: generateOAuth2CodeVerifier(),
                code_challenge: codeVerifier,
                ...(prompt ? { prompt } : {}),
            });

        const code = new URL(authorizeResponse.url).searchParams.get('code')!;

        return suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.entity.id,
                redirect_uri: redirectUri,
                code,
                code_verifier: codeVerifier,
            });
    }

    async function readTokenRow(token: string): Promise<SessionTokenEntity> {
        const { jti } = decodeJwtPayload(token);
        expect(jti).toBeDefined();

        const row = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .findOne({ where: { id: jti! } });
        expect(row).not.toBeNull();

        return row!;
    }

    function bearerFor(token: string): HTTPClient {
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token });

        return client;
    }

    it('reuses the login session without touching its subject FK', async () => {
        const accountConsole = await resolveSystemClient(CLIENT_ACCOUNT_CONSOLE_NAME);

        const password = 'account-console-session-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        // 1) interactive login on the hosted authorize page: the password
        //    grant creates the (client-less) bearer session
        const login = await suite.client
            .token
            .createWithPassword({ username: user.name, password });

        const userClient = bearerFor(login.access_token);

        const loginIntrospect = await userClient.token.introspect({ token: login.access_token }, { authorizationHeaderInherit: true });
        const userId = loginIntrospect.sub!;
        const loginSessionId = loginIntrospect.session_id!;
        expect(loginSessionId).toBeDefined();

        // 2) the account surface's kick: auth-code + PKCE against the
        //    per-realm public account-console client, then the public-client
        //    token exchange (PKCE, no secret)
        const tokenResponse = await authorizeAndExchange(userClient, accountConsole, '/console/account');

        expect(tokenResponse.access_token).toBeDefined();

        const exchangeClient = bearerFor(tokenResponse.access_token);
        const exchangeIntrospect = await exchangeClient.token.introspect({ token: tokenResponse.access_token }, { authorizationHeaderInherit: true });

        // the exchanged token rides the very same session as the login ...
        expect(exchangeIntrospect.session_id).toEqual(loginSessionId);

        // ... exactly ONE session row exists for the user ...
        const sessions = await suite.client.session.getMany({ filters: { sub: userId } });
        const own = sessions.data.filter((s) => s.sub === userId);
        expect(own).toHaveLength(1);
        expect(own[0].id).toEqual(loginSessionId);

        // ... and the client-less row is claimed by the account-console
        // client, the first application to authorize on this session.
        // not stamped: `clientId` is the client-subject FK, and this session
        // belongs to a user. The account-console attribution is on the tokens.
        expect(own[0].clientId).toBeNull();
    });

    // Plan 086: the visitor arrives at /console/account with an admin-console session,
    // so the console forces a silent code flow against its OWN client. The
    // point of that flow is a token attributed to `account-console`. Without
    // per-token attribution the shell would render off an admin-console token
    // and the account-console client's accessPolicyId would never be evaluated.
    it('attributes the forced account-console flow per token, on one shared session', async () => {
        const adminConsole = await resolveSystemClient(CLIENT_ADMIN_CONSOLE_NAME);
        const accountConsole = await resolveSystemClient(CLIENT_ACCOUNT_CONSOLE_NAME);

        const password = 'account-console-forced-flow-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        // 1) the visitor signed in to the ADMIN console: hosted credential
        //    login plus its own code flow, leaving one session on the IdP origin
        const login = await suite.client
            .token
            .createWithPassword({ username: user.name, password });
        const sessionId = decodeJwtPayload(login.access_token).session_id!;

        const adminGrant = await authorizeAndExchange(
            bearerFor(login.access_token),
            adminConsole,
            '/login/callback',
        );
        expect(decodeJwtPayload(adminGrant.access_token).session_id).toEqual(sessionId);

        // 2) opening /console/account: the session's client is not `account-console`,
        //    so the console re-mints against its own client silently. The
        //    bearer is the one the shared IdP-origin cookie jar holds.
        const accountGrant = await authorizeAndExchange(
            bearerFor(adminGrant.access_token),
            accountConsole,
            '/console/account',
            OAuth2AuthorizationPrompt.NONE,
        );
        expect(decodeJwtPayload(accountGrant.access_token).session_id).toEqual(sessionId);

        // the forced flow adds NO session row: it re-mints on the existing one
        const sessions = await suite.client.session.getMany({ filters: { sub: user.id } });
        const own = sessions.data.filter((s) => s.sub === user.id);
        expect(own).toHaveLength(1);
        expect(own[0].id).toEqual(sessionId);

        // the session keeps the admin console, which got there first ...
        expect(own[0].clientId).toBeNull();

        // ... while each console's tokens carry their own application
        expect((await readTokenRow(adminGrant.access_token)).clientId).toEqual(adminConsole.entity.id);
        expect((await readTokenRow(accountGrant.access_token)).clientId).toEqual(accountConsole.entity.id);
        expect((await readTokenRow(accountGrant.refresh_token!)).clientId).toEqual(accountConsole.entity.id);
    });
});
