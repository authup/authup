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
import { ScopeName, UserAuthenticatorKind } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import {
    OAuth2AuthenticationContextClass,
    OAuth2AuthenticationMethodReference,
    OAuth2AuthorizationResponseType,
    OAuth2ErrorCode,
    OAuth2TokenKind,
} from '@authup/specs';
import { Secret, TOTP } from 'otpauth';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { MailInjectionKey } from '../../../../../../src/app';
import { FakeMailClient } from '../../../../core/helpers/index.ts';
import { createFakeClient, createFakeUser, httpRequest } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const MFA_TICKET_MAX_AGE = 600;

describe('src/http/controllers/token (mfa-pending login ticket)', () => {
    const mailClient = new FakeMailClient();

    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
            config.mfaTicketMaxAge = MFA_TICKET_MAX_AGE;
        },
    });

    beforeAll(async () => {
        suite.container.register(MailInjectionKey, { useValue: mailClient });
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    function passwordGrant(form: Record<string, string>): Promise<Response> {
        return httpRequest(suite, 'POST', '/token', { form: { grant_type: 'password', ...form } });
    }

    function ticketClient(ticket: string): HTTPClient {
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: ticket });
        return client;
    }

    // The issue #3242 scenario end-to-end: a user whose ONLY confirmed
    // factor is email (interactive — cannot ride the single grant POST)
    // completes a FRESH interactive login through the MFA-pending ticket.
    it('completes a fresh email-only login via the mfa ticket', async () => {
        const password = 'ticket-email-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        // enroll the email factor (pre-enrollment login still passes)
        const preLogin = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: preLogin.access_token });
        await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.EMAIL });

        // 1) fresh credential-only login → mfa_required WITH an mfa ticket
        const rejected = await passwordGrant({ username: user.name, password });
        expect(rejected.status).toEqual(400);
        const rejectedBody = await rejected.json();
        expect(rejectedBody.code).toEqual(ErrorCode.OAUTH_MFA_REQUIRED);
        expect(rejectedBody.error).toEqual(OAuth2ErrorCode.MFA_REQUIRED);
        expect(rejectedBody.kinds).toEqual([UserAuthenticatorKind.EMAIL]);
        expect(typeof rejectedBody.mfa_token).toEqual('string');
        expect(rejectedBody.mfa_token_expires_in).toBeGreaterThan(0);
        expect(rejectedBody.mfa_token_expires_in).toBeLessThanOrEqual(MFA_TICKET_MAX_AGE);
        // never a usable token pair alongside the ticket
        expect(rejectedBody.access_token).toBeUndefined();
        expect(rejectedBody.refresh_token).toBeUndefined();

        const ticket = rejectedBody.mfa_token as string;
        const viaTicket = ticketClient(ticket);

        // 2) DEFAULT-DENY: the ticket is refused as a bearer on the API
        const denied = await httpRequest(suite, 'GET', '/users/@me', { headers: { Authorization: `Bearer ${ticket}` } });
        expect(denied.status).toEqual(401);

        // 3) the pending session is ticket-scoped: it self-expires with the
        // ticket instead of lingering for the full session lifetime. The user
        // holds two sessions here (the enrollment bearer + the pending one) —
        // the ticket-scoped one is the one expiring soonest.
        const pending = await suite.client.session.getMany({ filters: { userId: user.id } });
        expect(pending.data.length).toBeGreaterThan(1);
        const [pendingSession] = [...pending.data].sort(
            (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
        );
        expect(pendingSession.mfaAt ?? null).toBeNull();
        const pendingExpiresIn = (new Date(pendingSession.expiresAt).getTime() - Date.now()) / 1_000;
        expect(pendingExpiresIn).toBeGreaterThan(MFA_TICKET_MAX_AGE - 120);
        expect(pendingExpiresIn).toBeLessThanOrEqual(MFA_TICKET_MAX_AGE + 60);

        // 4) ... but the challenge surface accepts it
        const status = await viaTicket.userAuthenticator.challenge();
        expect(status.required).toBeTruthy();
        expect(status.kinds).toEqual([UserAuthenticatorKind.EMAIL]);

        mailClient.clear();
        const send = await viaTicket.userAuthenticator.sendChallenge({ kind: UserAuthenticatorKind.EMAIL });
        expect(send.success).toBeTruthy();
        expect(mailClient.sent).toHaveLength(1);
        const code = /(\d{6})/.exec(mailClient.sent[0].text ?? '')![1];

        // 5) verify completes the login — the response carries the FULL grant
        const verified = await viaTicket.userAuthenticator.verifyChallenge({
            kind: UserAuthenticatorKind.EMAIL,
            response: code,
        });
        expect(verified.verified).toBeTruthy();
        expect(verified.token).toBeDefined();
        expect(verified.token!.access_token).toBeDefined();
        expect(verified.token!.refresh_token).toBeDefined();
        expect(verified.token!.expires_in).toBeGreaterThan(0);

        // 6) the minted access token is a first-class bearer ...
        const loggedIn = new HTTPClient({ baseURL: suite.baseURL });
        loggedIn.setAuthorizationHeader({ type: 'Bearer', token: verified.token!.access_token });
        const me = await loggedIn.userInfo.get();
        expect(me.id).toEqual(user.id);

        // ... whose claims advertise the completed factor
        const introspection = await httpRequest(suite, 'POST', '/token/introspect', { form: { token: verified.token!.access_token } });
        expect(introspection.status).toEqual(200);
        const claims = await introspection.json();
        expect(claims.kind).toEqual(OAuth2TokenKind.ACCESS);
        expect(claims.acr).toEqual(OAuth2AuthenticationContextClass.MFA);
        expect(claims.amr).toContain(OAuth2AuthenticationMethodReference.OTP);
        expect(claims.session_id).toEqual(pendingSession.id);

        // 7) the completed session satisfies the /authorize backstop and got
        // extended to the regular session lifetime
        const clientSecret = generateOAuth2CodeVerifier();
        const { data: oauthClient } = await suite.client.client.create(createFakeClient({
            secret: clientSecret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scopeId: scope.id,
            clientId: oauthClient.id,
        });

        const authorizeResponse = await loggedIn.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: oauthClient.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            state: generateOAuth2CodeVerifier(),
        });
        expect(new URL(authorizeResponse.url).searchParams.get('code')).toBeTruthy();

        const { data: completed } = await suite.client.session.getOne(pendingSession.id);
        expect(completed.mfaAt).toBeTruthy();
        const completedExpiresIn = (new Date(completed.expiresAt).getTime() - Date.now()) / 1_000;
        expect(completedExpiresIn).toBeGreaterThan(MFA_TICKET_MAX_AGE + 60);

        // 8) the ticket is single use, consumed by the completion (the same
        // 401 + inactive_token shape as any revoked bearer on this API)
        const replay = await httpRequest(suite, 'GET', '/authenticators/challenge', { headers: { Authorization: `Bearer ${ticket}` } });
        expect(replay.status).toEqual(401);
        const replayBody = await replay.json();
        expect(replayBody.code).toEqual(ErrorCode.JWT_INACTIVE);
    });

    // TOTP/recovery ride the single-POST `otp` fast-path — minting a pending
    // session per plain code entry would be pure churn, so no ticket.
    it('does not issue a ticket for totp/recovery-only users', async () => {
        const password = 'ticket-totp-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const preLogin = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: preLogin.access_token });

        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.TOTP });
        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(enrolled.meta.secret!),
        });
        await bearer.userAuthenticator.confirm('@me', enrolled.data.id, { code: totp.generate() });

        const rejected = await passwordGrant({ username: user.name, password });
        expect(rejected.status).toEqual(400);
        const rejectedBody = await rejected.json();
        expect(rejectedBody.code).toEqual(ErrorCode.OAUTH_MFA_REQUIRED);
        expect(rejectedBody.kinds).toEqual([UserAuthenticatorKind.TOTP]);
        expect(rejectedBody.mfa_token).toBeUndefined();
    });

    // A mixed-kind user (totp + email) gets the ticket too — the interactive
    // challenge covers every kind, incl. a totp code entered against it.
    it('completes a totp verify against the ticket for a mixed-kind user', async () => {
        const password = 'ticket-mixed-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const preLogin = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: preLogin.access_token });

        await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.EMAIL });
        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.TOTP });
        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(enrolled.meta.secret!),
        });
        // confirm with the PREVIOUS step's code so the verify below can use
        // the current one (each TOTP use advances the persisted step).
        await bearer.userAuthenticator.confirm('@me', enrolled.data.id, { code: totp.generate({ timestamp: Date.now() - 30_000 }) });

        const rejected = await passwordGrant({ username: user.name, password });
        const rejectedBody = await rejected.json();
        expect(rejectedBody.kinds).toEqual(
            expect.arrayContaining([UserAuthenticatorKind.EMAIL, UserAuthenticatorKind.TOTP]),
        );
        expect(typeof rejectedBody.mfa_token).toEqual('string');

        const viaTicket = ticketClient(rejectedBody.mfa_token as string);
        const verified = await viaTicket.userAuthenticator.verifyChallenge({
            kind: UserAuthenticatorKind.TOTP,
            response: totp.generate(),
        });
        expect(verified.verified).toBeTruthy();
        expect(verified.token!.access_token).toBeDefined();
    });

    // An invalid factor against the ticket must not leak a grant.
    it('rejects an invalid challenge response against the ticket', async () => {
        const password = 'ticket-invalid-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const preLogin = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: preLogin.access_token });
        await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.EMAIL });

        const rejected = await passwordGrant({ username: user.name, password });
        const rejectedBody = await rejected.json();

        const response = await httpRequest(suite, 'POST', '/authenticators/challenge', {
            headers: {
                Authorization: `Bearer ${rejectedBody.mfa_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ kind: UserAuthenticatorKind.EMAIL, response: '000000' }),
        });
        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
        expect(body.token).toBeUndefined();
    });
});
