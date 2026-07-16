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
import { OAuth2AuthorizationResponseType, OAuth2ErrorCode } from '@authup/specs';
import { Secret, TOTP } from 'otpauth';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import {
    createFakeClient,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('src/http/controllers/token (password grant + authorize MFA)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    function passwordGrant(form: Record<string, string>): Promise<Response> {
        return httpRequest(suite, 'POST', '/token', { form: { grant_type: 'password', ...form } });
    }

    it('gates the password grant and /authorize on a second factor', async () => {
        const password = 'mfa-user-password';
        const user = await suite.client.user.create(createFakeUser({ password }));

        // 1) pre-enrollment: the grant passes without an otp (a user could
        // never enroll otherwise)
        const preLogin = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });

        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: preLogin.access_token });

        let challenge = await bearer.userAuthenticator.challenge();
        expect(challenge.required).toBeFalsy();

        // 2) enroll + confirm a TOTP device on @me
        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.TOTP });
        expect(enrolled.meta.secret).toBeDefined();
        expect(enrolled.meta.uri).toContain('otpauth://totp/');
        expect(enrolled.meta.qr).toContain('data:image/png');

        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(enrolled.meta.secret!),
        });

        const confirmed = await bearer.userAuthenticator.confirm('@me', enrolled.data.id, { code: totp.generate() });
        expect(confirmed.confirmed).toBeTruthy();

        // the read surface never carries secret material
        const list = await bearer.userAuthenticator.getMany('@me');
        expect(list.data).toHaveLength(1);
        expect(list.data[0].secret ?? null).toBeNull();
        expect(list.data[0].codes ?? null).toBeNull();

        challenge = await bearer.userAuthenticator.challenge();
        expect(challenge.required).toBeTruthy();
        expect(challenge.kinds).toEqual([UserAuthenticatorKind.TOTP]);

        // 3) the grant now rejects a password-only login
        const withoutOtp = await passwordGrant({ username: user.name, password });
        expect(withoutOtp.status).toEqual(400);
        const withoutOtpBody = await withoutOtp.json();
        expect(withoutOtpBody.code).toEqual(ErrorCode.OAUTH_MFA_REQUIRED);
        expect(withoutOtpBody.error).toEqual(OAuth2ErrorCode.MFA_REQUIRED);
        // the challengeable kinds ride the error so the hosted login form can
        // present the right second-factor step (single-POST otp vs interactive).
        expect(withoutOtpBody.kinds).toEqual([UserAuthenticatorKind.TOTP]);

        // 4) ... and accepts password + otp. Use the PREVIOUS step's code (valid
        // via the ±1 window) so the consumed step stays behind the challenge
        // code in step 6 — each successful TOTP use must advance the step
        // (anti-replay, #3237).
        const withOtp = await passwordGrant({
            username: user.name,
            password,
            otp: totp.generate({ timestamp: Date.now() - 30_000 }),
        });
        expect(withOtp.status).toEqual(200);
        const withOtpBody = await withOtp.json();
        expect(withOtpBody.access_token).toBeDefined();

        // 5) /authorize backstop: the PRE-enrollment bearer session carries
        // no mfa proof — the code request fails closed
        const clientSecret = generateOAuth2CodeVerifier();
        const oauthClient = await suite.client.client.create(createFakeClient({
            secret: clientSecret,
            secret_hashed: false,
            secret_encrypted: false,
            auth_method: 'secret',
            token_binding_method: 'none',
        }));
        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: oauthClient.id,
        });

        const authorizeInput = {
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: oauthClient.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            state: generateOAuth2CodeVerifier(),
        };

        await expectClientError(
            () => bearer.authorize.confirm(authorizeInput),
            {
                status: 400,
                code: ErrorCode.OAUTH_MFA_REQUIRED,
                data: { error: OAuth2ErrorCode.MFA_REQUIRED },
            },
        );

        // 6) the challenge endpoint stamps mfa_at onto the bearer session,
        // after which the same bearer authorizes
        const verified = await bearer.userAuthenticator.verifyChallenge({
            kind: UserAuthenticatorKind.TOTP,
            response: totp.generate(),
        });
        expect(verified.verified).toBeTruthy();

        const authorizeResponse = await bearer.authorize.confirm(authorizeInput);
        expect(new URL(authorizeResponse.url).searchParams.get('code')).toBeTruthy();

        // 7) an invalid otp keeps the grant closed
        const withBadOtp = await passwordGrant({
            username: user.name,
            password,
            otp: '000000',
        });
        expect(withBadOtp.status).toEqual(400);
        const withBadOtpBody = await withBadOtp.json();
        expect(withBadOtpBody.code).toEqual(ErrorCode.OAUTH_MFA_REQUIRED);
    });

    it('accepts a recovery code on the otp parameter', async () => {
        const password = 'mfa-recovery-password';
        const user = await suite.client.user.create(createFakeUser({ password }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.RECOVERY });
        expect(enrolled.meta.codes).toHaveLength(10);

        const [code] = enrolled.meta.codes!;
        const withRecovery = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: user.name,
                password,
                otp: code,
            },
        });
        expect(withRecovery.status).toEqual(200);

        // single use — the same code is rejected on replay
        const replay = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: user.name,
                password,
                otp: code,
            },
        });
        expect(replay.status).toEqual(400);
        const replayBody = await replay.json();
        expect(replayBody.code).toEqual(ErrorCode.OAUTH_MFA_REQUIRED);
    });
});
