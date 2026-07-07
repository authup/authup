/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Identity } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2AuthorizationResponseType, OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2Authorization } from '../../../../../src/core/oauth2/authorization/module.ts';
import type {
    IIdentityResolver,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2OpenIDTokenIssuer,
    IOAuth2TokenIssuer,
} from '../../../../../src/core/index.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

// response_type=none + scope=global reaches the prompt/max_age gate without
// invoking any issuer, so these stubs must never be called.
const notCalled = (name: string) => async () => {
    throw new Error(`${name} should not be called`);
};

const accessTokenIssuer = { issue: notCalled('accessTokenIssuer.issue') } as unknown as IOAuth2TokenIssuer;
const openIdTokenIssuer = {
    issue: notCalled('openIdTokenIssuer.issue'),
    issueWithIdentity: notCalled('openIdTokenIssuer.issueWithIdentity'),
} as unknown as IOAuth2OpenIDTokenIssuer;
const codeIssuer = {
    issue: notCalled('codeIssuer.issue'),
    updateIdToken: notCalled('codeIssuer.updateIdToken'),
} as unknown as IOAuth2AuthorizationCodeIssuer;
const identityResolver = { resolve: async () => null } as unknown as IIdentityResolver;

describe('OAuth2Authorization prompt/max_age enforcement', () => {
    const realmId = randomUUID();
    const sessionId = randomUUID();

    let sessionManager: FakeSessionManager;
    let authorization: OAuth2Authorization;

    const identity = {
        type: OAuth2SubKind.USER,
        data: {
            id: randomUUID(),
            realm: { id: realmId, name: 'master' },
        },
    } as unknown as Identity;

    const buildData = (extra: Record<string, any> = {}) => ({
        response_type: OAuth2AuthorizationResponseType.NONE,
        client_id: randomUUID(),
        realm_id: realmId,
        redirect_uri: 'https://example.com/callback',
        scope: ScopeName.GLOBAL,
        ...extra,
    });

    const seedSession = async (ageSeconds: number) => {
        const createdAt = new Date((Math.floor(Date.now() / 1000) - ageSeconds) * 1000).toISOString();
        await sessionManager.create({
            id: sessionId,
            sub: identity.data.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            created_at: createdAt,
        });
    };

    beforeEach(() => {
        sessionManager = new FakeSessionManager();
        authorization = new OAuth2Authorization({
            accessTokenIssuer,
            openIdTokenIssuer,
            codeIssuer,
            identityResolver,
            sessionManager,
            promptLoginMaxAge: 60,
        });
    });

    it('should reject prompt=login when the session is older than the max age', async () => {
        await seedSession(600);

        await expect(
            authorization.authorize(buildData({ prompt: 'login' }), identity, { sessionId }),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));
    });

    it('should accept prompt=login when the session is fresh', async () => {
        await seedSession(1);

        const result = await authorization.authorize(buildData({ prompt: 'login' }), identity, { sessionId });
        expect(result.redirectUri).toEqual('https://example.com/callback');
    });

    it('should reject when max_age is exceeded', async () => {
        await seedSession(200);

        await expect(
            authorization.authorize(buildData({ max_age: 100 }), identity, { sessionId }),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));
    });

    it('should accept when the session is within max_age', async () => {
        await seedSession(50);

        const result = await authorization.authorize(buildData({ max_age: 100 }), identity, { sessionId });
        expect(result.redirectUri).toEqual('https://example.com/callback');
    });

    it('should not enforce freshness when neither prompt=login nor max_age is present', async () => {
        await seedSession(10_000);

        const result = await authorization.authorize(buildData(), identity, { sessionId });
        expect(result.redirectUri).toEqual('https://example.com/callback');
    });

    it('should treat a session-less request as freshly authenticated', async () => {
        // no session seeded / no sessionId → auth_time = now → passes
        const result = await authorization.authorize(buildData({ prompt: 'login', max_age: 0 }), identity, {});
        expect(result.redirectUri).toEqual('https://example.com/callback');
    });
});
