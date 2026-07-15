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
import { Secret, TOTP } from 'otpauth';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { createFakeClient, createFakeUser, httpRequest } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

function decodeJwtPayload(token: string): OAuth2TokenPayload {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
}

describe('src/http/controllers/token (id_token amr/acr claims)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    let oauthClient: Client;
    const clientSecret = generateOAuth2CodeVerifier();

    beforeAll(async () => {
        await suite.setup();

        oauthClient = await suite.client.client.create(createFakeClient({
            secret: clientSecret,
            secret_hashed: false,
            secret_encrypted: false,
            auth_method: 'secret',
            token_binding_method: 'none',
        }));
        for (const name of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const scope = await suite.client.scope.getOne(name);
            await suite.client.clientScope.create({
                scope_id: scope.id,
                client_id: oauthClient.id,
            });
        }
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createUser(password: string): Promise<User> {
        return suite.client.user.create(createFakeUser({ password }));
    }

    async function bearerFor(token: string): Promise<HTTPClient> {
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token });
        return client;
    }

    async function authorizeAndExchange(
        bearer: HTTPClient,
        extra: Record<string, any> = {},
    ) {
        const authorizeResponse = await bearer.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: oauthClient.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            state: generateOAuth2CodeVerifier(),
            ...extra,
        });
        const code = new URL(authorizeResponse.url).searchParams.get('code')!;

        return suite.client.token.createWithAuthorizationCode({
            client_id: oauthClient.id,
            client_secret: clientSecret,
            redirect_uri: 'https://example.com/redirect',
            code,
        });
    }

    it('emits amr=[pwd] / acr=urn:authup:pwd for a password login', async () => {
        const password = 'claims-pwd-user';
        const user = await createUser(password);

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = await bearerFor(login.access_token);

        const tokenResponse = await authorizeAndExchange(bearer);
        expect(tokenResponse.id_token).toBeDefined();

        const idToken = decodeJwtPayload(tokenResponse.id_token!);
        expect(idToken.amr).toEqual(['pwd']);
        expect(idToken.acr).toEqual('urn:authup:pwd');
        expect(idToken.sid).toBeDefined();
        expect(typeof idToken.auth_time).toEqual('number');

        // deliberately on the access token too (resource servers read the
        // method without parsing an id_token)
        const accessToken = decodeJwtPayload(tokenResponse.access_token);
        expect(accessToken.amr).toEqual(['pwd']);
        expect(accessToken.acr).toEqual('urn:authup:pwd');
    });

    it('emits amr/acr on the DIRECT password grant tokens (no authorize exchange)', async () => {
        const password = 'claims-direct-user';
        const user = await createUser(password);

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });

        // the ROPC grant issues the final tokens directly — they must carry the
        // derived method the same way the authorization_code exchange does.
        const accessToken = decodeJwtPayload(login.access_token);
        expect(accessToken.amr).toEqual(['pwd']);
        expect(accessToken.acr).toEqual('urn:authup:pwd');

        const refreshToken = decodeJwtPayload(login.refresh_token!);
        expect(refreshToken.amr).toEqual(['pwd']);
        expect(refreshToken.acr).toEqual('urn:authup:pwd');
    });

    it('emits amr=[pwd,otp] / acr=urn:authup:mfa after a second factor, satisfying acr step-up', async () => {
        const password = 'claims-mfa-user';
        const user = await createUser(password);

        // enroll + confirm a TOTP device
        const preLogin = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const enrollBearer = await bearerFor(preLogin.access_token);
        const enrolled = await enrollBearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.TOTP });
        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(enrolled.secret!),
        });
        await enrollBearer.userAuthenticator.confirm('@me', enrolled.entity.id, { code: totp.generate() });

        // fresh login WITH the second factor — the session carries mfa_at
        const withOtp = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: user.name,
                password,
                otp: totp.generate(),
            },
        });
        expect(withOtp.status).toEqual(200);
        const withOtpBody = await withOtp.json();
        const bearer = await bearerFor(withOtpBody.access_token);

        // acr_values step-up passes — the proof is fresh (within the window)
        const tokenResponse = await authorizeAndExchange(bearer, { acr_values: 'urn:authup:mfa' });

        const idToken = decodeJwtPayload(tokenResponse.id_token!);
        expect(idToken.amr).toEqual(['pwd', 'otp']);
        expect(idToken.acr).toEqual('urn:authup:mfa');
    });
});
