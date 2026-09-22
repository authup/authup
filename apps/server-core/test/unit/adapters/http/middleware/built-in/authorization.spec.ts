/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionMemoryProvider } from '@authup/access';
import type { User } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { OAuth2SubKind, OAuth2TokenKind, isJWTError } from '@authup/specs';
import {
    describe,
    expect,
    it,
} from 'vitest';
import { AuthorizationMiddleware } from '../../../../../../src/adapters/http/middleware/built-in/authorization/module.ts';
import { buildActorContext, useRequestGrants, useRequestIdentity } from '../../../../../../src/adapters/http/request/index.ts';
import {
    FakeIdentityPermissionProvider,
    FakeIdentityResolver,
    FakeOAuth2TokenVerifier,
    FakeSessionManager,
} from '../../../../core/helpers/index.ts';
import { FakeSessionRepository } from '../../../../core/entities/session/fake-repository.ts';
import { createFakeEvent } from '../../request/fake-event.ts';

const TOKEN = 'token-under-test';

function createSuite() {
    const tokenVerifier = new FakeOAuth2TokenVerifier();
    const sessionManager = new FakeSessionManager();
    const sessionRepository = new FakeSessionRepository();
    const identityResolver = new FakeIdentityResolver();
    const identityPermissionProvider = new FakeIdentityPermissionProvider();

    const middleware = new AuthorizationMiddleware({
        identityResolver,
        identityPermissionProvider,
        sessionManager,
        sessionRepository,
        oauth2TokenVerifier: tokenVerifier,
        permissionProvider: new PermissionMemoryProvider(),
        options: { baseURL: 'https://authup.test' },
    });

    return {
        middleware,
        tokenVerifier,
        sessionManager,
        sessionRepository,
        identityResolver,
        identityPermissionProvider,
    };
}

/**
 * routup's dispatch walk re-enters earlier middlewares once per remaining
 * match when no handler produced a response (routup/routup#946) — on an
 * unmatched route the authorization middleware used to re-verify the same
 * credentials ~100+ times (~4s per authenticated 404). The run is memoized
 * per request, so every re-entry settles from the first run.
 */
describe('src/adapters/http/middleware/built-in/authorization', () => {
    it('verifies a bearer credential once across re-entries of the same request', async () => {
        const suite = createSuite();

        const realmId = randomUUID();
        const user : User = {
            id: randomUUID(),
            name: 'jdoe',
            nameLocked: false,
            firstName: null,
            lastName: null,
            displayName: null,
            email: 'jdoe@example.com',
            emailVerified: false,
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
            pathId: null,
            path: null,
        };

        const session = await suite.sessionManager.create({ sub: user.id, subKind: IdentityType.USER });
        suite.tokenVerifier.seed(TOKEN, {
            kind: OAuth2TokenKind.ACCESS,
            realm_id: realmId,
            session_id: session.id,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
        });
        suite.identityResolver.setIdentity({
            type: IdentityType.USER,
            data: user,
        });

        const event = createFakeEvent({ headers: { authorization: `Bearer ${TOKEN}` } });

        await suite.middleware.run(event);
        await suite.middleware.run(event);

        expect(suite.tokenVerifier.verifyCalls).toHaveLength(1);
        expect(suite.identityResolver.resolveCalls).toHaveLength(1);
        expect(suite.sessionManager.pingCalls).toHaveLength(1);
        expect(useRequestIdentity(event)?.id).toEqual(user.id);
    });

    it('re-rejects an invalid credential from the memoized settlement', async () => {
        const suite = createSuite();

        const event = createFakeEvent({ headers: { authorization: 'Bearer not-a-valid-token' } });

        await expect(suite.middleware.run(event)).rejects.toSatisfy(isJWTError);
        await expect(suite.middleware.run(event)).rejects.toSatisfy(isJWTError);

        expect(suite.tokenVerifier.verifyCalls).toHaveLength(1);
    });

    it('keeps separate requests independently verified', async () => {
        const suite = createSuite();

        const first = createFakeEvent({});
        const second = createFakeEvent({});

        await suite.middleware.run(first);
        await suite.middleware.run(second);

        // header-less runs verify nothing but still settle per request
        expect(suite.tokenVerifier.verifyCalls).toHaveLength(0);
        expect(first.store).not.toBe(second.store);
    });
});

/**
 * The request's grants (#3597): its own subject holds what its token carries,
 * resolved once per request; anyone else, and a request without a token,
 * resolve as themselves.
 */
describe('src/adapters/http/middleware/built-in/authorization (request grants)', () => {
    const clientId = randomUUID();

    async function runBearer(suite: ReturnType<typeof createSuite>) {
        const realmId = randomUUID();
        const user = {
            id: randomUUID(), 
            name: 'jdoe', 
            realmId, 
        } as User;

        const session = await suite.sessionManager.create({ sub: user.id, subKind: IdentityType.USER });
        suite.tokenVerifier.seed(TOKEN, {
            kind: OAuth2TokenKind.ACCESS,
            realm_id: realmId,
            session_id: session.id,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            client_id: clientId,
        });
        suite.identityResolver.setIdentity({ type: IdentityType.USER, data: user });

        const event = createFakeEvent({ headers: { authorization: `Bearer ${TOKEN}` } });
        await suite.middleware.run(event);

        return { event, user };
    }

    it('resolves the request subject through its token, once per request', async () => {
        const suite = createSuite();
        const { event, user } = await runBearer(suite);

        await useRequestGrants(event, { type: IdentityType.USER, id: user.id });
        await useRequestGrants(event, { type: IdentityType.USER, id: user.id });
        await buildActorContext(event).grants!();

        expect(suite.identityPermissionProvider.getForTokenCalls).toHaveLength(1);
        expect(suite.identityPermissionProvider.getForTokenCalls[0]).toMatchObject({
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            client_id: clientId,
        });
        expect(suite.identityPermissionProvider.getForCalls).toHaveLength(0);
    });

    it('resolves any other subject as itself', async () => {
        const suite = createSuite();
        const { event } = await runBearer(suite);

        const other = { type: IdentityType.USER, id: randomUUID() };
        await useRequestGrants(event, other);

        expect(suite.identityPermissionProvider.getForTokenCalls).toHaveLength(0);
        expect(suite.identityPermissionProvider.getForCalls).toEqual([other]);
    });

    it('resolves a request without a token as itself', async () => {
        const suite = createSuite();
        const event = createFakeEvent({});
        await suite.middleware.run(event);

        const identity = { type: IdentityType.USER, id: randomUUID() };
        await useRequestGrants(event, identity);

        expect(suite.identityPermissionProvider.getForTokenCalls).toHaveLength(0);
        expect(suite.identityPermissionProvider.getForCalls).toEqual([identity]);
    });
});
