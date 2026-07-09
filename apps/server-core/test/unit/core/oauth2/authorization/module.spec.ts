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
    IOAuth2AuthorizationCodeIssuer,
} from '../../../../../src/core/index.ts';
import type { OAuth2AuthorizationCodeIssuerOptions } from '../../../../../src/core/oauth2/authorization/code/issuer/types.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

// The code issuer records its calls so the authTime propagation can be asserted.
// No id_token is minted here anymore (that moved to the /token exchange), so no
// openid-issuer stub is needed.
const issueCalls: OAuth2AuthorizationCodeIssuerOptions[] = [];
const codeIssuer: IOAuth2AuthorizationCodeIssuer = {
    issue: async (_input, _identity, options = {}) => {
        issueCalls.push(options);
        return {
            id: randomUUID(),
            sub: randomUUID(),
            sub_kind: OAuth2SubKind.USER,
            realm_id: randomUUID(),
            realm_name: 'master',
        };
    },
};

describe('OAuth2Authorization prompt/max_age enforcement', () => {
    const realmId = randomUUID();
    const sessionId = randomUUID();

    let sessionManager: FakeSessionManager;
    let authorization: OAuth2Authorization;

    const identity: Identity = {
        type: OAuth2SubKind.USER,
        data: {
            id: randomUUID(),
            name: 'user',
            name_locked: false,
            first_name: null,
            last_name: null,
            display_name: null,
            email: 'user@example.com',
            password: null,
            avatar: null,
            cover: null,
            reset_hash: null,
            reset_at: null,
            reset_expires: null,
            status: null,
            status_message: null,
            active: true,
            activate_hash: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            realm_id: realmId,
            realm: {
                id: realmId,
                name: 'master',
                display_name: null,
                description: null,
                built_in: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        },
    };

    const buildData = (extra: Record<string, any> = {}) => ({
        response_type: OAuth2AuthorizationResponseType.CODE,
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
        issueCalls.length = 0;
        sessionManager = new FakeSessionManager();
        authorization = new OAuth2Authorization({
            codeIssuer,
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

    it('should source auth_time from created_at, never refreshed_at', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        await sessionManager.create({
            id: sessionId,
            sub: identity.data.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            created_at: new Date((nowSeconds - 600) * 1000).toISOString(),
            // A recent token refresh must NOT count as (re-)authentication — if
            // the implementation regressed to `refreshed_at ?? created_at`, this
            // fresh value would let a long-stale login satisfy prompt=login.
            refreshed_at: new Date(nowSeconds * 1000).toISOString(),
        });

        await expect(
            authorization.authorize(buildData({ prompt: 'login' }), identity, { sessionId }),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));
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

    it.each([
        ['token'],
        ['id_token'],
        ['none'],
        ['code token'],
        ['id_token token'],
    ])('should reject the dropped response type "%s" (OAuth 2.1)', async (responseType) => {
        await expect(
            authorization.authorize(buildData({ response_type: responseType }), identity, {}),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED }));
    });

    it('should issue an authorization code for response_type=code', async () => {
        const result = await authorization.authorize(buildData(), identity, {});
        expect(result.authorizationCode).toBeDefined();
    });

    it('should pass the session created_at as authTime to the code issuer', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        await seedSession(300);

        await authorization.authorize(buildData(), identity, { sessionId });

        expect(issueCalls).toHaveLength(1);
        expect(issueCalls[0].sessionId).toEqual(sessionId);
        // ~300s ago (created_at), not "now"
        expect(issueCalls[0].authTime).toBeLessThanOrEqual(nowSeconds - 299);
    });

    it('should pass authTime = now to the code issuer for a session-less authorize', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);

        await authorization.authorize(buildData(), identity, {});

        expect(issueCalls).toHaveLength(1);
        expect(issueCalls[0].sessionId ?? undefined).toBeUndefined();
        expect(issueCalls[0].authTime).toBeGreaterThanOrEqual(nowSeconds - 1);
    });
});
