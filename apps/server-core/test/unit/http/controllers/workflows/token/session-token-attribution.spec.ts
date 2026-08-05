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
import type { Client, User } from '@authup/core-kit';
import { ScopeName, UserAuthenticatorKind } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { SessionTokenEntity } from '../../../../../../src/adapters/database/domains/index.ts';
import { MailInjectionKey } from '../../../../../../src/app';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { FakeMailClient } from '../../../../core/helpers/index.ts';
import { createFakeClient, createFakeUser, httpRequest } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const REDIRECT_URI = 'https://example.com/redirect';

function decodeJwtPayload(token: string): OAuth2TokenPayload {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
}

// Plan 086 part 2: per-application attribution lives on `auth_session_tokens`,
// not on `auth_sessions`. One browser session on the IdP origin legitimately
// serves several applications, so the session column can only ever name one of
// them — the token row names the application each individual token was minted
// for.
describe('src/http/controllers/token (session-token client attribution)', () => {
    const mailClient = new FakeMailClient();

    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    let confidentialClient: Client;
    const confidentialSecret = generateOAuth2CodeVerifier();

    beforeAll(async () => {
        suite.container.register(MailInjectionKey, { useValue: mailClient });
        await suite.setup();

        confidentialClient = await createConfidentialClient(confidentialSecret);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createConfidentialClient(secret: string): Promise<Client> {
        const { data: client } = await suite.client.client.create(createFakeClient({
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

        return client;
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

    /**
     * A user holding a confirmed EMAIL factor — an interactive kind, so a
     * credential login answers with an MFA-pending ticket instead of a token
     * pair. Email is confirmed on enrollment (the address is presumed verified
     * via activation).
     */
    async function createEmailFactorUser(password: string): Promise<User> {
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
        await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.EMAIL });

        return user;
    }

    /**
     * The interactive second-factor login: a credential POST that answers
     * `mfa_required` with an MFA-pending ticket, then the email challenge the
     * ticket completes the login through.
     */
    async function completeMfaLogin(
        user: User,
        password: string,
        clientCredentials?: { client_id: string, client_secret: string },
    ) {
        const rejected = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: user.name,
                password,
                ...clientCredentials,
            },
        });
        expect(rejected.status).toEqual(400);
        const rejectedBody = await rejected.json();
        expect(typeof rejectedBody.mfa_token).toEqual('string');

        const viaTicket = new HTTPClient({ baseURL: suite.baseURL });
        viaTicket.setAuthorizationHeader({ type: 'Bearer', token: rejectedBody.mfa_token });

        mailClient.clear();
        await viaTicket.userAuthenticator.sendChallenge({ kind: UserAuthenticatorKind.EMAIL });
        expect(mailClient.sent).toHaveLength(1);
        const code = /(\d{6})/.exec(mailClient.sent[0].text ?? '')![1];

        const verified = await viaTicket.userAuthenticator.verifyChallenge({
            kind: UserAuthenticatorKind.EMAIL,
            response: code,
        });
        expect(verified.token).toBeDefined();

        return verified.token!;
    }

    async function authorizeAndExchange(bearer: HTTPClient, client: Client, secret: string) {
        const authorizeResponse = await bearer.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            scope: `${ScopeName.GLOBAL}`,
            state: generateOAuth2CodeVerifier(),
        });
        const code = new URL(authorizeResponse.url).searchParams.get('code')!;

        return suite.client.token.createWithAuthorizationCode({
            client_id: client.id,
            client_secret: secret,
            redirect_uri: REDIRECT_URI,
            code,
        });
    }

    it('attributes a client_credentials access row to the authenticating client', async () => {
        const grant = await suite.client.token.createWithClientCredentials({
            client_id: confidentialClient.id,
            client_secret: confidentialSecret,
        });

        const row = await readTokenRow(grant.access_token);
        expect(row.kind).toEqual('access');
        expect(row.clientId).toEqual(confidentialClient.id);

        // The M2M grant mints no refresh token, so this row is the session's
        // entire inventory. Its `auth_sessions.client_id` names the same
        // client, but as the session SUBJECT — a different statement from the
        // row's "the application this token was issued for".
        const rows = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .find({ where: { sessionId: row.sessionId } });
        expect(rows).toHaveLength(1);
    });

    it('attributes both password-grant rows to the authenticating client', async () => {
        const password = 'attribution-client-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            client_id: confidentialClient.id,
            client_secret: confidentialSecret,
        });

        const accessRow = await readTokenRow(login.access_token);
        const refreshRow = await readTokenRow(login.refresh_token!);

        expect(accessRow.kind).toEqual('access');
        expect(refreshRow.kind).toEqual('refresh');
        expect(accessRow.sessionId).toEqual(refreshRow.sessionId);
        expect(accessRow.clientId).toEqual(confidentialClient.id);
        expect(refreshRow.clientId).toEqual(confidentialClient.id);
    });

    it('leaves the rows unattributed for a client-less hosted login', async () => {
        const password = 'attribution-hosted-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        // the hosted login form posts credentials with no client_id — the
        // baseline the interactive flows below start from.
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });

        expect((await readTokenRow(login.access_token)).clientId).toBeNull();
        expect((await readTokenRow(login.refresh_token!)).clientId).toBeNull();
    });

    it('carries the attribution down the refresh rotation chain', async () => {
        const password = 'attribution-rotation-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const rotate = (refreshToken: string) => suite.client.token.createWithRefreshToken({
            refresh_token: refreshToken,
            client_id: confidentialClient.id,
            client_secret: confidentialSecret,
        });

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            client_id: confidentialClient.id,
            client_secret: confidentialSecret,
        });
        const first = await rotate(login.refresh_token!);
        const second = await rotate(first.refresh_token!);

        const refreshRows = [
            await readTokenRow(login.refresh_token!),
            await readTokenRow(first.refresh_token!),
            await readTokenRow(second.refresh_token!),
        ];
        const accessRow = await readTokenRow(second.access_token);

        // the lineage is intact ...
        expect(refreshRows[1].parentId).toEqual(refreshRows[0].id);
        expect(refreshRows[2].parentId).toEqual(refreshRows[1].id);
        expect(accessRow.refreshTokenId).toEqual(refreshRows[2].id);

        // ... and every hop stays attributed to the client that started it.
        // The refresh grant re-issues from the presented token's own payload
        // and never resolves a client for the rotated pair, so a dropped
        // client_id would silently blank the attribution from the second
        // generation onwards rather than fail.
        for (const row of [...refreshRows, accessRow]) {
            expect(row.clientId).toEqual(confidentialClient.id);
        }
    });

    // THE regression this plan exists for: before it, `auth_sessions.client_id`
    // was overwritten on every exchange, so it reported whichever application
    // authorized most recently and per-app attribution (plan 079) did not hold
    // in this topology at all.
    it('keeps session.clientId at the FIRST client while each application\'s rows carry their own', async () => {
        const firstSecret = generateOAuth2CodeVerifier();
        const firstApp = await createConfidentialClient(firstSecret);
        const secondSecret = generateOAuth2CodeVerifier();
        const secondApp = await createConfidentialClient(secondSecret);

        // 1) hosted credential login: ONE client-less session on the IdP origin
        const password = 'attribution-two-apps-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });

        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
        const sessionId = decodeJwtPayload(login.access_token).session_id!;

        // 2) the first application authorizes on that session
        const firstGrant = await authorizeAndExchange(bearer, firstApp, firstSecret);
        expect(decodeJwtPayload(firstGrant.access_token).session_id).toEqual(sessionId);

        const afterFirst = await suite.client.session.getOne(sessionId);
        expect(afterFirst.data.clientId).toEqual(firstApp.id);

        // 3) the second application authorizes on the SAME session, using the
        //    same bearer — the shared cookie jar of the IdP origin.
        const secondGrant = await authorizeAndExchange(bearer, secondApp, secondSecret);
        expect(decodeJwtPayload(secondGrant.access_token).session_id).toEqual(sessionId);

        // the session records the client that FIRST authorized on it, and is
        // never overwritten afterwards.
        const afterSecond = await suite.client.session.getOne(sessionId);
        expect(afterSecond.data.clientId).toEqual(firstApp.id);
        expect(afterSecond.data.clientId).not.toEqual(secondApp.id);

        // attribution that IS per application lives on the token rows
        expect((await readTokenRow(firstGrant.access_token)).clientId).toEqual(firstApp.id);
        expect((await readTokenRow(firstGrant.refresh_token!)).clientId).toEqual(firstApp.id);
        expect((await readTokenRow(secondGrant.access_token)).clientId).toEqual(secondApp.id);
        expect((await readTokenRow(secondGrant.refresh_token!)).clientId).toEqual(secondApp.id);

        // and both applications rode one browser session, as Authentik and
        // Keycloak also model it (no sibling session per application).
        const sessions = await suite.client.session.getMany({ filters: { sub: user.id } });
        expect(sessions.data.filter((s) => s.sub === user.id)).toHaveLength(1);
    });

    it('derives the mfa-login completion attribution from the pending session', async () => {
        const password = 'attribution-mfa-password';

        // OAuth2MfaLoginService reads the client off the pending session (it
        // holds no client repository of its own). The hosted login form names
        // no client, so its rows record null rather than guessing an
        // application — the fail-closed answer for a consumer gating on the
        // attribution.
        const anonymous = await completeMfaLogin(await createEmailFactorUser(password), password);
        expect((await readTokenRow(anonymous.access_token)).clientId).toBeNull();
        expect((await readTokenRow(anonymous.refresh_token!)).clientId).toBeNull();

        // control for the assertion above: that null is DERIVED, not hardcoded
        // on this path — a credential login that does name a client carries it
        // through the ticket's pending session onto the completed login. It
        // needs its own user: the email challenge has a per-user send
        // cooldown, so a second login for the same user would get no code.
        const attributed = await completeMfaLogin(await createEmailFactorUser(password), password, {
            client_id: confidentialClient.id,
            client_secret: confidentialSecret,
        });
        expect((await readTokenRow(attributed.access_token)).clientId).toEqual(confidentialClient.id);
        expect((await readTokenRow(attributed.refresh_token!)).clientId).toEqual(confidentialClient.id);
    });
});
