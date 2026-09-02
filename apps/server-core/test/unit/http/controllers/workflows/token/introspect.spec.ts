/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    CLIENT_ADMIN_CONSOLE_NAME,
    PermissionName,
    REALM_MASTER_NAME,
    buildUserFakeEmail,
} from '@authup/core-kit';
import { ClientAuthenticationHook, Client as HTTPClient } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2TokenKind } from '@authup/specs';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../../app';
import { createFakeClient, expectClientError, httpRequest } from '../../../../../utils';

/**
 * RFC 7662 §2.2: a token that is not active or does not exist on this server
 * MUST be answered with `active: false`, never raised. That covers a token
 * this server cannot read at all, which used to answer 401 (404 when its
 * `kid` named no key) - and reporting it uniformly also stops the endpoint
 * telling a caller whether a string was signed by a key we hold.
 *
 * An EXPIRED token is the one case that carries more than the bare flag: it
 * is verified with `ignoreExpiry` and reported with its payload and the
 * subject's claims, so a relying party can say "your session ended, <name>"
 * instead of only "no". That is a deliberate departure from the §2.2 / §4
 * SHOULD NOT, taken for a token this server did issue and can still read.
 */
describe('token-introspect', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should report an expired token as inactive and still name its subject', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const payload = await suite.client
            .token
            .introspect({ token: response.access_token }, { authorizationHeaderInherit: true });

        expect(payload.active).toBeTruthy();

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        const expiredToken = await signer.sign({
            jti: payload.jti,
            sub: payload.sub,
            sub_kind: payload.sub_kind,
            realm_id: payload.realm_id,
            client_id: payload.client_id,
            kind: payload.kind,
            session_id: payload.session_id,
            iat: now - 7200,
            exp: now - 3600,
        });

        const introspection = await suite.client
            .token
            .introspect({ token: expiredToken }, { authorizationHeaderInherit: true });

        expect(introspection.active).toBe(false);

        // the point of reading it rather than refusing it: the caller can name
        // the account whose session ended
        expect(introspection.sub).toEqual(payload.sub);
        expect(introspection.sub_kind).toEqual(payload.sub_kind);
        expect((introspection as Record<string, any>).name).toEqual('admin');

        // ...and nothing about what that account may do (RFC 7662 §2.2 / §4:
        // no more than needed about an inactive token).
        expect(introspection.permissions).toBeUndefined();
    });

    it('should still report permissions for a live token', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const introspection = await suite.client
            .token
            .introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });

        expect(introspection.active).toBe(true);
        expect(Array.isArray(introspection.permissions)).toBe(true);
        expect(introspection.permissions!.length).toBeGreaterThan(0);
    });

    // The kit's `store.user` is built from these claims and nothing else, so
    // a consumer keys its gravatar on the address this response carries
    // (issue #3506). Nothing pinned it: the claim is mapped from a
    // `select: false` column that only survives because the identity
    // repository re-selects it, and both halves are silently droppable.
    it('should carry the subject email claim for a live token', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const introspection = await suite.client
            .token
            .introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });

        expect(introspection.active).toBe(true);
        expect(introspection.email).toEqual(buildUserFakeEmail('admin'));
        // #3519. The provisioned admin is `active: true` with a SYNTHESIZED
        // `admin@example.com` that has never received anything, which is
        // exactly the address the old `email_verified: 'active'` mapping
        // asserted as verified. It is now the flag's own column, and nothing
        // has verified this one.
        expect(introspection.email_verified).toBe(false);
    });

    // Without the controller deriving `active` from `exp`, this is the
    // regression that bites: `ignoreExpiry` makes the verify accept the token,
    // and the signature-keyed cache returns a hit without re-checking `exp`
    // either, so the report would say the token is live.
    it('should not report an expired token as active', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const current = await suite.client
            .token
            .introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        const justExpired = await signer.sign({
            jti: current.jti,
            sub: current.sub,
            sub_kind: current.sub_kind,
            realm_id: current.realm_id,
            client_id: current.client_id,
            kind: current.kind,
            session_id: current.session_id,
            iat: now - 60,
            exp: now - 1,
        });

        expect((await suite.client.token.introspect({ token: justExpired }, { authorizationHeaderInherit: true })).active).toBe(false);
    });

    // RFC 7662 §2.2: a token that "does not exist on this server" is reported,
    // not raised. Bare, per the same section and §4 - and there is nothing to
    // report about it anyway.
    it('should report a malformed token as inactive, and nothing else', async () => {
        const introspection = await suite.client
            .token
            .introspect({ token: 'not-a-json-web-token' }, { authorizationHeaderInherit: true });

        expect(introspection.active).toBe(false);
        expect(Object.keys(introspection)).toEqual(['active']);
    });

    it('should report a token signed under an unknown key as inactive', async () => {
        // A `kid` naming no resolvable key answered 404 (`JWK_NOT_FOUND`)
        // before it became a JWTError.
        const header = Buffer
            .from(JSON.stringify({
                alg: 'RS256', 
                typ: 'JWT', 
                kid: '6b0f4a5c-0d2e-4f1a-9c3b-8e7d6f5a4b3c', 
            }))
            .toString('base64url');
        const body = Buffer
            .from(JSON.stringify({ sub: 'someone', exp: Math.floor(Date.now() / 1000) + 3600 }))
            .toString('base64url');

        const introspection = await suite.client
            .token
            .introspect({ token: `${header}.${body}.signature` }, { authorizationHeaderInherit: true });

        expect(introspection.active).toBe(false);
        expect(Object.keys(introspection)).toEqual(['active']);
    });

    // A back-channel logout token is signed with the realm key like every
    // other token, so it verifies; it is a notification, not a credential,
    // and is reported dead and bare rather than as its subject's token.
    it('should report a logout token as inactive, and nothing else', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });
        const current = await suite.client
            .token
            .introspect({ token: grant.access_token }, { authorizationHeaderInherit: true });

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        const logoutToken = await signer.sign({
            kind: OAuth2TokenKind.LOGOUT,
            jti: randomUUID(),
            iss: current.iss,
            aud: current.client_id,
            sub: current.sub,
            sid: current.session_id,
            realm_id: current.realm_id,
            exp: now + 120,
            events: { 'http://schemas.openid.net/event/backchannel-logout': {} },
        });

        const introspection = await suite.client
            .token
            .introspect({ token: logoutToken }, { authorizationHeaderInherit: true });

        expect(introspection).toEqual({ active: false });
    });

    // The token PARAMETER is still part of the request contract: a body without
    // one is malformed, not a report about a token.
    it('should reject a request carrying no token', async () => {
        await expectClientError(
            () => suite.client.token.introspect({ token: '' } as any, { authorizationHeaderInherit: true }),
            { status: 400 },
        );
    });
});

/**
 * RFC 7662 §2.1: "To prevent token scanning attacks, the endpoint MUST also
 * require some form of authorization to access this endpoint, such as client
 * authentication as described in OAuth 2.0 [RFC6749] or a separate OAuth 2.0
 * access token". The credential has to be INDEPENDENT of the token being
 * introspected: the kit presents its live access token as the bearer, a
 * resource server its own client-credentials bearer, a confidential relying
 * party its client secret. Possession of the introspected string alone proves
 * nothing, which is why the expired report is reachable only this way (#3489).
 */
describe('token-introspect authorization', () => {
    const suite = createTestApplication();

    let accessToken : string;

    let expiredToken : string;

    const clientSecret = 'introspect-secret-123';

    let confidentialClientId : string;

    let confidentialClientName : string;

    let masterRealmId : string;

    beforeAll(async () => {
        await suite.setup();

        masterRealmId = (await suite.client.realm.getOne(REALM_MASTER_NAME)).data.id;

        const grant = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });
        accessToken = grant.access_token;

        const current = await suite.client
            .token
            .introspect({ token: accessToken }, { authorizationHeaderInherit: true });

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        expiredToken = await signer.sign({
            jti: current.jti,
            sub: current.sub,
            sub_kind: current.sub_kind,
            realm_id: current.realm_id,
            client_id: current.client_id,
            kind: current.kind,
            session_id: current.session_id,
            iat: now - 7200,
            exp: now - 3600,
        });

        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            secret: clientSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        confidentialClientId = client.id;
        confidentialClientName = client.name;

        // the shared confidential client plays the authorized resource
        // server: introspecting FOREIGN tokens takes the TOKEN_INTROSPECT
        // grant (its default `own` reach covers same-realm tokens)
        const { data: permission } = await suite.client.permission.getOne(PermissionName.TOKEN_INTROSPECT);
        await suite.client.clientPermission.create({
            clientId: client.id,
            permissionId: permission.id,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should challenge an anonymous caller', async () => {
        const response = await httpRequest(suite, 'POST', '/token/introspect', { form: { token: accessToken } });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toEqual('Bearer');
        expect((await response.json()).code).toEqual(ErrorCode.IDENTITY_UNAUTHORIZED);
    });

    it('should challenge an anonymous caller reporting an expired token', async () => {
        // the expired report names the subject; that is exactly what must not
        // be reachable by whoever finds a lapsed token string
        const response = await httpRequest(suite, 'POST', '/token/introspect', { form: { token: expiredToken } });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toEqual('Bearer');
    });

    it('should not take the expired token itself as the credential', async () => {
        // the issue's "self-introspection exemption" cannot exist: possession
        // of the string is what a finder has too, and the middleware answers
        // the expired bearer before the route runs
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            headers: { Authorization: `Bearer ${expiredToken}` },
            form: { token: expiredToken },
        });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toContain('error="invalid_token"');
    });

    it('should gate the GET variant identically', async () => {
        const response = await httpRequest(suite, 'GET', `/token/introspect?token=${encodeURIComponent(accessToken)}`);

        expect(response.status).toEqual(401);
    });

    it('should refuse a bare public client_id as authorization', async () => {
        // identification is not authentication: anyone knows `admin-console`
        // (the realm hint rides `readRealmHint`: `realm_id` or `realm_name`,
        // canonicalized; a name-form client_id is scoped by it)
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token: accessToken,
                client_id: CLIENT_ADMIN_CONSOLE_NAME,
                realm_id: masterRealmId,
            },
        });

        expect(response.status).toEqual(401);
        expect((await response.json()).code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
    });

    it('should refuse a wrong client secret', async () => {
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token: accessToken,
                client_id: confidentialClientId,
                client_secret: 'definitely-wrong',
            },
        });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toBeNull();
        expect((await response.json()).code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
    });

    it('should accept confidential client credentials in the body', async () => {
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token: accessToken,
                client_id: confidentialClientId,
                client_secret: clientSecret,
            },
        });

        expect(response.status).toEqual(200);
        const body = await response.json();
        expect(body.active).toBe(true);
        expect(body.sub_kind).toEqual('user');
    });

    it('should ignore a non-string realm hint instead of failing', async () => {
        // a JSON body can carry anything under realm_id; readRealmHint reads
        // string values only, so the resolve stays unscoped. The client is
        // NAME-identified here, since a UUID skips the realm predicate anyway
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: accessToken,
                client_id: confidentialClientName,
                client_secret: clientSecret,
                realm_id: { nested: true },
            }),
        });

        expect(response.status).toEqual(200);
        expect((await response.json()).active).toBe(true);
    });

    it('should accept confidential client credentials as Basic', async () => {
        const basic = Buffer.from(`${confidentialClientId}:${clientSecret}`).toString('base64');
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            headers: { Authorization: `Basic ${basic}` },
            form: { token: expiredToken },
        });

        expect(response.status).toEqual(200);
        const body = await response.json();
        // the point of the gate: the expired report stays, for a caller that
        // proved who it is
        expect(body.active).toBe(false);
        expect(body.name).toEqual('admin');
        expect(body.permissions).toBeUndefined();
    });

    it('should accept a live bearer introspecting itself', async () => {
        // the kit's shape: the token is both the credential and the subject
        const client = new HTTPClient({ baseURL: suite.baseURL });
        const introspection = await client.token.introspect(
            { token: accessToken },
            { authorizationHeader: { type: 'Bearer', token: accessToken } },
        );

        expect(introspection.active).toBe(true);
        expect(Array.isArray(introspection.permissions)).toBe(true);
    });

    it('should accept a live bearer introspecting another token', async () => {
        // a foreign token takes the TOKEN_INTROSPECT grant (or the
        // issued-for client); the admin bearer holds it at `any` reach
        const client = new HTTPClient({ baseURL: suite.baseURL });
        const introspection = await client.token.introspect(
            { token: expiredToken },
            { authorizationHeader: { type: 'Bearer', token: accessToken } },
        );

        expect(introspection.active).toBe(false);
        expect(introspection.sub).toBeDefined();
    });

    it('should let a resource server authenticate through the hook on the first 401', async () => {
        // the server adapters' remote mode (server-adapter-kit TokenVerifier):
        // the first introspection goes out anonymous, the hook answers the
        // 401 by running its creator and replaying with that bearer, and
        // `authorizationHeaderInherit` keeps it through hapic's transformer.
        // The client holds TOKEN_INTROSPECT, which a resource server
        // verifying foreign tokens needs
        const client = new HTTPClient({ baseURL: suite.baseURL });
        const hook = new ClientAuthenticationHook({
            baseURL: suite.baseURL,
            tokenCreator: () => client.token.createWithClientCredentials({
                client_id: confidentialClientId,
                client_secret: clientSecret,
            }),
        });
        hook.attach(client);

        const introspection = await client.token.introspect(
            { token: accessToken },
            { authorizationHeaderInherit: true },
        );

        expect(introspection.active).toBe(true);
        expect(introspection.sub_kind).toEqual('user');
    });

    it('should report a foreign token as inactive to a caller without the grant', async () => {
        // authenticated, but neither the subject, nor the issued-for client,
        // nor granted TOKEN_INTROSPECT: RFC 7662 §2.2's "not allowed to
        // introspect", answered bare and indistinguishable from a dead token
        const { data: bystander } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            secret: 'bystander-secret-1',
            secretHashed: false,
            secretEncrypted: false,
        });

        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token: accessToken,
                client_id: bystander.id,
                client_secret: 'bystander-secret-1',
            },
        });

        expect(response.status).toEqual(200);
        expect(await response.json()).toEqual({ active: false });
    });

    it('should let the issued-for client introspect without the grant', async () => {
        const { data: rp } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            secret: 'issued-for-secret-1',
            secretHashed: false,
            secretEncrypted: false,
        });

        // a token ISSUED FOR that client (password grant with client auth)
        const grant = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
            client_id: rp.id,
            client_secret: 'issued-for-secret-1',
        });

        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token: grant.access_token,
                client_id: rp.id,
                client_secret: 'issued-for-secret-1',
            },
        });

        expect(response.status).toEqual(200);
        const body = await response.json();
        expect(body.active).toBe(true);
        expect(body.client_id).toEqual(rp.id);
        expect(body.sub_kind).toEqual('user');
    });

    it('should bound the grant by its realm reach', async () => {
        // an `own`-reach grant in another realm does not cover a master token
        const { data: realm } = await suite.client.realm.create({ name: 'introspect-reach' });
        const { data: foreign } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            realmId: realm.id,
            secret: 'foreign-secret-1',
            secretHashed: false,
            secretEncrypted: false,
        });
        const { data: permission } = await suite.client.permission.getOne(PermissionName.TOKEN_INTROSPECT);
        await suite.client.clientPermission.create({
            clientId: foreign.id,
            permissionId: permission.id,
        });

        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token: accessToken,
                client_id: foreign.id,
                client_secret: 'foreign-secret-1',
            },
        });

        expect(response.status).toEqual(200);
        expect(await response.json()).toEqual({ active: false });
    });

    it('should still report an unreadable token bare once authorized', async () => {
        const introspection = await suite.client
            .token
            .introspect({ token: 'not-a-json-web-token' }, { authorizationHeaderInherit: true });

        expect(Object.keys(introspection)).toEqual(['active']);
    });
});

/**
 * RFC 6750 §3: a 401 from a protected resource carries the Bearer challenge.
 * The gate is the request's own Authorization header, so the token endpoint's
 * `invalid_client` 401 (RFC 6749 §5.2) must not get one.
 */
describe('bearer challenge', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should challenge a dead bearer on a protected route', async () => {
        const response = await httpRequest(suite, 'GET', '/users/@me', { headers: { authorization: 'Bearer not-a-json-web-token' } });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toContain('Bearer');
        expect(response.headers.get('www-authenticate')).toContain('error="invalid_token"');
    });

    it('should challenge a request carrying no credentials at all', async () => {
        const response = await httpRequest(suite, 'GET', '/users/@me');

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toEqual('Bearer');
    });

    it('should not challenge the token endpoint', async () => {
        // invalid_client is a 401 too, and it is not a bearer failure
        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'client_credentials',
                client_id: 'system',
                client_secret: 'definitely-wrong',
            },
        });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toBeNull();
        expect((await response.json()).code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
    });
});
