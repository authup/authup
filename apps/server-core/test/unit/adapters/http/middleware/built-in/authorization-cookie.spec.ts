/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionMemoryProvider } from '@authup/access';
import type { Session, User } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import {
    describe,
    expect,
    it,
} from 'vitest';
import { AuthorizationMiddleware } from '../../../../../../src/adapters/http/middleware/built-in/authorization/module.ts';
import type { HTTPAuthorizationMiddlewareOptions } from '../../../../../../src/adapters/http/middleware/built-in/authorization/types.ts';
import { CONSOLE_SESSION_COOKIE } from '../../../../../../src/core/index.ts';
import {
    useRequestIdentity,
    useRequestScopes,
    useRequestSessionId,
} from '../../../../../../src/adapters/http/request/index.ts';
import {
    FakeIdentityPermissionProvider,
    FakeIdentityResolver,
    FakeOAuth2TokenVerifier,
    FakeSessionManager,
} from '../../../../core/helpers/index.ts';
import { FakeSessionRepository } from '../../../../core/entities/session/fake-repository.ts';
import { createFakeEvent } from '../../request/fake-event.ts';

const BASE_URL = 'https://authup.test';
const SECRET = 'console-session-secret';
const BEARER = 'bearer-token-under-test';

function createUser(realmId: string) : User {
    return {
        id: randomUUID(),
        name: 'jdoe',
        nameLocked: false,
        firstName: null,
        lastName: null,
        displayName: null,
        email: 'jdoe@example.com',
        password: null,
        avatar: null,
        cover: null,
        resetHash: null,
        resetAt: null,
        resetExpires: null,
        status: null,
        statusMessage: null,
        active: true,
        activateHash: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        realmId,
        realm: {
            id: realmId,
            name: 'master',
            displayName: null,
            description: null,
            builtIn: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        },
    };
}

function createSuite(
    session: Partial<Session>,
    user: User,
    options: HTTPAuthorizationMiddlewareOptions = { baseURL: BASE_URL },
) {
    const tokenVerifier = new FakeOAuth2TokenVerifier();
    const sessionManager = new FakeSessionManager();
    const sessionRepository = new FakeSessionRepository();
    const identityResolver = new FakeIdentityResolver();

    sessionRepository.seed(session);
    identityResolver.setIdentity({
        type: IdentityType.USER,
        data: user,
    });

    const middleware = new AuthorizationMiddleware({
        identityResolver,
        identityPermissionProvider: new FakeIdentityPermissionProvider(),
        sessionManager,
        sessionRepository,
        oauth2TokenVerifier: tokenVerifier,
        permissionProvider: new PermissionMemoryProvider(),
        options,
    });

    return {
        middleware,
        tokenVerifier,
        sessionManager,
        sessionRepository,
        identityResolver,
    };
}

function createUserSession(user: User) : Partial<Session> {
    return {
        id: randomUUID(),
        sub: user.id,
        subKind: IdentityType.USER,
        secret: SECRET,
        realmId: user.realmId,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshedAt: new Date().toISOString(),
    };
}

/**
 * The console session cookie (plan 088). Every refusal below leaves the
 * request ANONYMOUS rather than rejecting it. A route's own guard answers.
 */
describe('src/adapters/http/middleware/built-in/authorization (cookie session)', () => {
    it('authenticates a same-origin request carrying the cookie', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);
        const suite = createSuite(session, user);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)?.id).toEqual(user.id);
        expect(useRequestSessionId(event)).toEqual(session.id);
        expect(useRequestScopes(event)).toEqual([ScopeName.GLOBAL, ScopeName.OPEN_ID]);
    });

    it('takes the bearer path and never reads the store when both are present', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);
        const suite = createSuite(session, user);

        const bearerSession = await suite.sessionManager.create({
            sub: user.id,
            subKind: IdentityType.USER,
        });
        suite.tokenVerifier.seed(BEARER, {
            kind: OAuth2TokenKind.ACCESS,
            realm_id: realmId,
            session_id: bearerSession.id,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
        });

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: {
                'sec-fetch-site': 'same-origin',
                authorization: `Bearer ${BEARER}`,
            },
        });

        await suite.middleware.run(event);

        expect(useRequestSessionId(event)).toEqual(bearerSession.id);
        // The cookie is not merely outranked, it is never looked at: the
        // header branch returns before the cookie branch is reached, so the
        // opaque credential costs no query on a bearer request.
        expect(suite.sessionRepository.findOneBySecretCalls).toHaveLength(0);
        // and the token is verified exactly once (the run memoization holds:
        // routup re-enters this middleware once per remaining match).
        expect(suite.tokenVerifier.verifyCalls).toHaveLength(1);
    });

    it.each([
        ['same-site'],
        ['cross-site'],
        ['none'],
    ])('stashes nothing for a %s request', async (value) => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': value },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
        expect(useRequestSessionId(event)).toBeUndefined();
    });

    it('stashes nothing when the fetch metadata header is absent', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
    });

    it('stashes nothing when a state-changing request carries a foreign origin', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user);

        const event = createFakeEvent({
            path: '/users/@me',
            method: 'POST',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: {
                'sec-fetch-site': 'same-origin',
                origin: 'https://evil.authup.test',
            },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
    });

    // Finding 2 of plan 088: an ambient cookie must never reach the OAuth2
    // issuance surface, or one script execution on this origin turns it back
    // into a portable token pair.
    it.each([
        ['/authorize'],
        ['/AUTHORIZE'],
        ['/authorize/'],
        ['/token'],
        ['/token/introspect'],
        ['//token'],
        ['/logout'],
    ])('stashes nothing for the denied path %s', async (path) => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user);

        const event = createFakeEvent({
            path,
            method: 'POST',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: {
                'sec-fetch-site': 'same-origin',
                origin: BASE_URL,
            },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
        expect(useRequestSessionId(event)).toBeUndefined();
    });

    it('stashes nothing for a client-subject session', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);
        session.subKind = IdentityType.CLIENT;

        const suite = createSuite(session, user);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
    });

    // The whole point of an opaque handle over a JWT: the row is consulted on
    // every request, so a session that has expired (or been swept) stops
    // authenticating immediately rather than at the token's own `exp`.
    it('stashes nothing for an expired session', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user);

        suite.sessionManager.verifyError = new Error('session expired');

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
        expect(useRequestSessionId(event)).toBeUndefined();
    });

    // Without publicUrl the origin gate cannot be evaluated at all, so the
    // credential is not honoured — the same fail-closed direction every other
    // condition takes.
    it('stashes nothing when no base url is configured', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user, {});

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
        expect(suite.sessionRepository.findOneBySecretCalls).toHaveLength(0);
    });

    it('stashes nothing for an unknown credential', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const suite = createSuite(createUserSession(user), user);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: 'not-the-secret' },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(useRequestIdentity(event)).toBeUndefined();
    });

    it('slides the session expiry, but never resurrects a deleted row', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);
        // beyond the throttle window
        session.refreshedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const suite = createSuite(session, user);

        // the manager knows nothing of this row: the shape a concurrent
        // sign-out leaves behind
        const gone = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(gone);

        expect(useRequestIdentity(gone)?.id).toEqual(user.id);
        expect(suite.sessionManager.refreshCalls).toHaveLength(0);

        await suite.sessionManager.create(session);

        const alive = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(alive);

        expect(suite.sessionManager.refreshCalls).toHaveLength(1);
    });

    it('re-arms the session cookie whenever it slides the expiry', async () => {
        // Regression: the slide moves `auth_sessions.expiresAt`, but a
        // cookie's Max-Age is fixed by the response that set it. Sliding
        // server-side WITHOUT re-issuing the cookie leaves the browser
        // discarding the credential at login + one lifetime however recently
        // the session was used, which is the hard cap the sliding decision
        // rejected — and the server-side slide would be happening all along,
        // simply never observable. Assert the Set-Cookie, not just the call.
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);
        session.refreshedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const suite = createSuite(session, user);
        // the guard against resurrecting a deleted row re-reads through the
        // manager, so the row has to be live there for a slide to happen
        await suite.sessionManager.create(session);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(suite.sessionManager.refreshCalls).toHaveLength(1);

        const setCookie = `${event.response.headers.get('set-cookie') ?? ''}`;

        expect(setCookie).toContain(`${CONSOLE_SESSION_COOKIE}=${SECRET}`);
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Strict');

        const maxAge = /Max-Age=(\d+)/.exec(setCookie);

        expect(maxAge).not.toBeNull();
        // a real remaining lifetime, not the millisecond value
        expect(Number(maxAge?.[1])).toBeGreaterThan(0);
        expect(Number(maxAge?.[1])).toBeLessThanOrEqual(30 * 24 * 60 * 60);
    });

    it('does not re-arm the session cookie when the slide is throttled', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);
        session.refreshedAt = new Date().toISOString();

        const suite = createSuite(session, user);
        await suite.sessionManager.create(session);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        // the row is live; it is the throttle window that prevents the slide
        expect(suite.sessionManager.refreshCalls).toHaveLength(0);
        expect(event.response.headers.get('set-cookie')).toBeNull();
    });

    it('does not slide the session expiry inside the throttle window', async () => {
        const realmId = randomUUID();
        const user = createUser(realmId);
        const session = createUserSession(user);

        const suite = createSuite(session, user);
        await suite.sessionManager.create(session);

        const event = createFakeEvent({
            path: '/users/@me',
            cookies: { [CONSOLE_SESSION_COOKIE]: SECRET },
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        await suite.middleware.run(event);

        expect(suite.sessionManager.refreshCalls).toHaveLength(0);
    });
});
