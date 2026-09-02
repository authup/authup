/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { Client, Realm, User } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { verifyToken } from '@authup/server-kit';
import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    JWKType,
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
} from '@authup/specs';
import {
    OAUTH2_BACKCHANNEL_LOGOUT_EVENT,
    buildOAuth2CodeChallenge,
    generateOAuth2CodeVerifier,
} from '../../../../../../src/core';
import { ConfigInjectionKey } from '../../../../../../src/app';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const REDIRECT_PATTERN = 'https://app.example.com/**';
const REDIRECT_URI = 'https://app.example.com/cb';
const BACKCHANNEL_PATH = '/backchannel-logout';

type Delivery = {
    method: string | undefined,
    path: string,
    contentType: string | undefined,
    token: string,
};

function decodeJwtSegment(token: string, index: number): Record<string, any> {
    return JSON.parse(Buffer.from(token.split('.')[index]!, 'base64url').toString('utf8'));
}

describe('back-channel logout', () => {
    const suite = createTestApplication();

    // The relying party: records every logout token it is handed and answers
    // with whatever status the test set, so a refusal can be simulated.
    let rpServer: Server;
    let rpURL: string;
    let rpStatus = 200;
    const deliveries: Delivery[] = [];

    let realm: Realm;
    let client: Client;
    let clientWithoutUri: Client;
    let publicUrl: string;

    beforeAll(async () => {
        rpServer = createServer((req, res) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => { chunks.push(chunk); });
            req.on('end', () => {
                const body = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
                deliveries.push({
                    method: req.method,
                    path: req.url ?? '',
                    contentType: req.headers['content-type'],
                    token: body.get('logout_token') ?? '',
                });

                res.statusCode = rpStatus;
                res.end();
            });
        });
        await new Promise<void>((resolve) => {
            rpServer.listen(0, '127.0.0.1', resolve);
        });
        rpURL = `http://127.0.0.1:${(rpServer.address() as AddressInfo).port}`;

        await suite.setup();

        publicUrl = suite.container.resolve(ConfigInjectionKey).publicUrl;

        realm = (await suite.client.realm.create(createFakeRealm())).data;

        const attributes = {
            realmId: realm.id,
            authMethod: 'none' as const,
            tokenBindingMethod: 'none' as const,
            secret: null,
            redirectUri: REDIRECT_PATTERN,
        };
        client = (await suite.client.client.create(createFakeClient({
            ...attributes,
            backchannelLogoutUri: `${rpURL}${BACKCHANNEL_PATH}`,
        }))).data;
        clientWithoutUri = (await suite.client.client.create(createFakeClient(attributes))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: clientWithoutUri.id });
        }
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            rpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    beforeEach(() => {
        deliveries.length = 0;
        rpStatus = 200;
    });

    const createUser = async () => {
        const password = generateOAuth2CodeVerifier();
        const { data: user } = await suite.client.user.create(createFakeUser({ realmId: realm.id, password }));

        return { user, password };
    };

    // The interactive flow: password login, authorize, exchange. The exchange
    // reuses the login's session (#3191), so one session holds tokens issued
    // for `target`, and the id_token names it in `sid`.
    const mintTokens = async (
        target: Client,
        user: User,
        password: string,
    ): Promise<OAuth2TokenGrantResponse> => {
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);
        const authorized = await userClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: target.id,
            redirect_uri: REDIRECT_URI,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            code_challenge: codeChallenge,
            code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            state: generateOAuth2CodeVerifier(),
        });

        const code = new URL(authorized.url).searchParams.get('code')!;
        return suite.client.token.createWithAuthorizationCode({
            client_id: target.name,
            redirect_uri: REDIRECT_URI,
            code,
            code_verifier: codeVerifier,
            realm_id: realm.id,
        });
    };

    const sessionIdOf = (tokens: OAuth2TokenGrantResponse): string => {
        const { sid } = decodeJwtSegment(tokens.id_token!, 1);
        expect(typeof sid).toEqual('string');

        return sid;
    };

    // A relying party's own check: the signature must verify against the
    // realm's published key set, resolved through the token header's kid.
    const verifyLogoutToken = async (token: string): Promise<OAuth2TokenPayload> => {
        const header = decodeJwtSegment(token, 0);
        const response = await fetch(`${suite.baseURL}/realms/${realm.id}/jwks`);
        const { keys } = await response.json() as { keys: Record<string, any>[] };
        const jwk = keys.find((key) => key.kid === header.kid);
        expect(jwk).toBeDefined();

        const key = await crypto.subtle.importKey(
            'jwk',
            {
                kty: jwk!.kty, 
                n: jwk!.n, 
                e: jwk!.e, 
            },
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            true,
            ['verify'],
        );

        return verifyToken(token, { type: JWKType.RSA, key });
    };

    const expectLogoutToken = async (
        delivery: Delivery,
        expected: {
            sessionId: string, 
            sub: string, 
            iss: string 
        },
    ) => {
        expect(delivery.method).toEqual('POST');
        expect(delivery.path).toEqual(BACKCHANNEL_PATH);
        expect(delivery.contentType).toEqual('application/x-www-form-urlencoded');

        const payload = await verifyLogoutToken(delivery.token);

        // the wire literal, not the enum: a missing enum member would pass as
        // `undefined === undefined`
        expect(payload.kind).toEqual('logout_token');
        expect(payload.sid).toEqual(expected.sessionId);
        expect(payload.sub).toEqual(expected.sub);
        expect(payload.aud).toEqual(client.id);
        expect(payload.iss).toEqual(expected.iss);
        expect(payload.realm_id).toEqual(realm.id);
        expect(payload.events).toEqual({ [OAUTH2_BACKCHANNEL_LOGOUT_EVENT]: {} });
        expect(typeof payload.jti).toEqual('string');
        expect(typeof payload.iat).toEqual('number');
        expect(payload.exp).toBeGreaterThan(payload.iat!);
        expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(120);
        expect(payload).not.toHaveProperty('nonce');
    };

    it('pushes one logout token to the client when an admin revokes the session', async () => {
        const { user, password } = await createUser();
        const tokens = await mintTokens(client, user, password);
        const sessionId = sessionIdOf(tokens);
        const idToken = decodeJwtSegment(tokens.id_token!, 1);

        await suite.client.session.delete(sessionId);

        expect(deliveries).toHaveLength(1);
        await expectLogoutToken(deliveries[0]!, {
            sessionId,
            sub: user.id,
            // what the RP compares against: the issuer its id_token named
            iss: idToken.iss,
        });
        expect(idToken.iss).toEqual(`${publicUrl.replace(/\/+$/, '')}/realms/${realm.name}`);
    });

    it('pushes one logout token when a verified id_token_hint ends the session', async () => {
        const { user, password } = await createUser();
        const tokens = await mintTokens(client, user, password);
        const sessionId = sessionIdOf(tokens);

        // The end-session work runs on the JSON call the rendered page makes;
        // the GET binding is a navigation that hands over to the console.
        const response = await httpRequest(suite, 'POST', '/logout', {
            body: JSON.stringify({ id_token_hint: tokens.id_token }),
            headers: { 'Content-Type': 'application/json' },
        });
        expect(response.status).toEqual(200);
        const body = await response.json();
        expect(body.serverRevoked).toBe(true);

        expect(deliveries).toHaveLength(1);
        await expectLogoutToken(deliveries[0]!, {
            sessionId,
            sub: user.id,
            iss: decodeJwtSegment(tokens.id_token!, 1).iss,
        });
    });

    it('pushes one logout token per session the subject signs out of elsewhere', async () => {
        const { user, password } = await createUser();
        const first = await mintTokens(client, user, password);
        const second = await mintTokens(client, user, password);

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: second.access_token });

        // self-service: every own session except the caller's current one
        const { count } = await userClient.session.deleteMany();
        expect(count).toEqual(1);

        expect(deliveries).toHaveLength(1);
        await expectLogoutToken(deliveries[0]!, {
            sessionId: sessionIdOf(first),
            sub: user.id,
            iss: decodeJwtSegment(first.id_token!, 1).iss,
        });
    });

    it('pushes nothing for a client that registered no back-channel logout URI', async () => {
        const { user, password } = await createUser();
        const tokens = await mintTokens(clientWithoutUri, user, password);

        await suite.client.session.delete(sessionIdOf(tokens));

        expect(deliveries).toHaveLength(0);
    });

    it('keeps the API answer when the client refuses the token', async () => {
        const { user, password } = await createUser();
        const tokens = await mintTokens(client, user, password);
        const sessionId = sessionIdOf(tokens);
        rpStatus = 500;

        const response = await httpRequest(suite, 'DELETE', `/sessions/${sessionId}`, { headers: { Authorization: `Basic ${Buffer.from('admin:start123').toString('base64')}` } });

        expect(response.status).toEqual(202);
        expect(deliveries).toHaveLength(1);
        // the session is gone regardless of what the client answered
        await expect(suite.client.session.getOne(sessionId)).rejects.toBeDefined();
    });
});
