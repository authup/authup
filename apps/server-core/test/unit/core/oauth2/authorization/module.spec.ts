/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IdentityPolicyData } from '@authup/access';
import type { Client, UserIdentity } from '@authup/core-kit';
import { EventName, ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import {
    OAuth2AuthorizationResponseType,
    OAuth2SubKind,
    isOAuth2AccessDeniedError,
} from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2Authorization } from '../../../../../src/core/oauth2/authorization/module.ts';
import type {
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeIssuer,
    IUserAuthenticatorChallengeProvider,
    UserAuthenticatorChallengeStatus,
} from '../../../../../src/core/index.ts';
import type { OAuth2AuthorizationCodeIssuerOptions } from '../../../../../src/core/oauth2/authorization/code/issuer/types.ts';
import { FakeAuthFlowMetrics, FakeEventService, FakeSessionManager } from '../../helpers/index.ts';

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

    const identity: UserIdentity = {
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

    // The promptLoginMaxAge window (default 60s) is a DELIBERATE stateless
    // approximation of "just re-authenticated" — a session created inside the
    // window satisfies prompt=login without a fresh credential entry. Pinned so
    // the sub-window behavior stays a contract, not an accident.
    it('should accept prompt=login anywhere inside the freshness window', async () => {
        await seedSession(30);

        const result = await authorization.authorize(buildData({ prompt: 'login' }), identity, { sessionId });
        expect(result.authorizationCode).toBeDefined();
    });

    it('should reject prompt=login just past the freshness window', async () => {
        await seedSession(90);

        await expect(
            authorization.authorize(buildData({ prompt: 'login' }), identity, { sessionId }),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));
    });

    it('should enforce max_age=0 as stricter than prompt=login (documented inversion)', async () => {
        // a 30s-old session passes prompt=login (inside the window) but fails
        // max_age=0 — an RP needing hard re-auth semantics sends max_age=0
        await seedSession(30);

        const viaPrompt = await authorization.authorize(buildData({ prompt: 'login' }), identity, { sessionId });
        expect(viaPrompt.authorizationCode).toBeDefined();

        await expect(
            authorization.authorize(buildData({ max_age: 0 }), identity, { sessionId }),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));
    });

    it('should pass the realm gate when the realm relation is not loaded but realm_id matches', async () => {
        // the gate compares the scalar realm_id column — it must not depend on
        // the realm relation having been joined onto the resolved identity
        const relationless: UserIdentity = {
            type: OAuth2SubKind.USER,
            data: { ...identity.data },
        };
        Reflect.deleteProperty(relationless.data, 'realm');

        const result = await authorization.authorize(buildData(), relationless, {});
        expect(result.authorizationCode).toBeDefined();
    });

    it('should throw login_required (not a TypeError) when the identity carries no realm_id', async () => {
        // an identity resolved without any realm information must fail the
        // realm gate closed — clean login_required, never a TypeError (still
        // no identity data in the body)
        const realmless: UserIdentity = {
            type: OAuth2SubKind.USER,
            data: { ...identity.data },
        };
        Reflect.deleteProperty(realmless.data, 'realm');
        Reflect.deleteProperty(realmless.data, 'realm_id');

        await expect(
            authorization.authorize(buildData(), realmless, {}),
        ).rejects.toThrow(expect.objectContaining({ code: ErrorCode.OAUTH_LOGIN_REQUIRED }));
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

describe('OAuth2Authorization MFA backstop + acr step-up', () => {
    const realmId = randomUUID();
    const sessionId = randomUUID();
    const userId = randomUUID();

    let sessionManager: FakeSessionManager;

    const identity: UserIdentity = {
        type: OAuth2SubKind.USER,
        data: {
            id: userId,
            realm_id: realmId,
            realm: { id: realmId, name: 'master' },
        } as UserIdentity['data'],
    };

    const buildData = (extra: Record<string, any> = {}) => ({
        response_type: OAuth2AuthorizationResponseType.CODE,
        client_id: randomUUID(),
        realm_id: realmId,
        redirect_uri: 'https://example.com/callback',
        scope: ScopeName.GLOBAL,
        ...extra,
    });

    const provider = (status: Partial<UserAuthenticatorChallengeStatus>): IUserAuthenticatorChallengeProvider => ({
        challenge: async () => ({
            required: false,
            enrollmentRequired: false,
            kinds: [],
            ...status,
        }),
    });

    const buildAuthorization = (
        challengeProvider?: IUserAuthenticatorChallengeProvider,
        mfaFreshnessMaxAge?: number,
    ) => new OAuth2Authorization({
        codeIssuer,
        sessionManager,
        mfaChallengeProvider: challengeProvider,
        mfaFreshnessMaxAge,
    });

    const seedSession = async (input: Record<string, any> = {}) => {
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            created_at: new Date().toISOString(),
            ...input,
        });
    };

    beforeEach(() => {
        issueCalls.length = 0;
        sessionManager = new FakeSessionManager();
    });

    it('should reject a confirmed-device user whose session carries no mfa proof', async () => {
        await seedSession({ mfa_at: null });
        const authorization = buildAuthorization(provider({ required: true }));

        await expect(authorization.authorize(buildData(), identity, { sessionId }))
            .rejects.toMatchObject({ code: ErrorCode.OAUTH_MFA_REQUIRED });
    });

    it('should reject a session-less flow while a factor is required', async () => {
        const authorization = buildAuthorization(provider({ required: true }));

        await expect(authorization.authorize(buildData(), identity, {}))
            .rejects.toMatchObject({ code: ErrorCode.OAUTH_MFA_REQUIRED });
    });

    it('should pass once the session carries the mfa proof', async () => {
        await seedSession({ mfa_at: new Date().toISOString() });
        const authorization = buildAuthorization(provider({ required: true }));

        const result = await authorization.authorize(buildData(), identity, { sessionId });
        expect(result.authorizationCode).toBeDefined();
    });

    it('should route a device-less user to enrollment under mfaRequired', async () => {
        await seedSession();
        const authorization = buildAuthorization(provider({ enrollmentRequired: true }));

        await expect(authorization.authorize(buildData(), identity, { sessionId }))
            .rejects.toMatchObject({ code: ErrorCode.OAUTH_MFA_REQUIRED });
    });

    it('should not gate a user without devices (nothing required)', async () => {
        await seedSession();
        const authorization = buildAuthorization(provider({}));

        const result = await authorization.authorize(buildData(), identity, { sessionId });
        expect(result.authorizationCode).toBeDefined();
    });

    it('should enforce acr step-up freshness against the window', async () => {
        // proof present but older than the freshness window
        await seedSession({ mfa_at: new Date(Date.now() - 120_000).toISOString() });
        const authorization = buildAuthorization(provider({ required: true }), 60);

        await expect(authorization.authorize(
            buildData({ acr_values: 'urn:authup:mfa' }),
            identity,
            { sessionId },
        )).rejects.toMatchObject({ code: ErrorCode.OAUTH_MFA_REQUIRED });
    });

    it('should satisfy acr step-up with a fresh proof', async () => {
        await seedSession({ mfa_at: new Date().toISOString() });
        const authorization = buildAuthorization(provider({ required: true }), 60);

        const result = await authorization.authorize(
            buildData({ acr_values: 'urn:authup:mfa' }),
            identity,
            { sessionId },
        );
        expect(result.authorizationCode).toBeDefined();
    });

    it('should ignore an unsatisfiable acr request for a factor-less user (voluntary claim)', async () => {
        await seedSession();
        const authorization = buildAuthorization(provider({}), 60);

        const result = await authorization.authorize(
            buildData({ acr_values: 'urn:authup:mfa' }),
            identity,
            { sessionId },
        );
        expect(result.authorizationCode).toBeDefined();
    });

    it('should ignore unknown acr tokens (forward-compat)', async () => {
        await seedSession({ mfa_at: new Date().toISOString() });
        const authorization = buildAuthorization(provider({ required: true }), 60);

        const result = await authorization.authorize(
            buildData({ acr_values: 'urn:example:gold' }),
            identity,
            { sessionId },
        );
        expect(result.authorizationCode).toBeDefined();
    });

    it('should thread the session auth_method into the issued code', async () => {
        await seedSession({ auth_method: 'pwd' });
        const authorization = buildAuthorization();

        await authorization.authorize(buildData(), identity, { sessionId });
        expect(issueCalls[0]).toEqual(expect.objectContaining({ authMethod: 'pwd' }));
    });

    it('should thread a null auth_method for a session-less authorize', async () => {
        const authorization = buildAuthorization();

        await authorization.authorize(buildData(), identity, {});
        expect(issueCalls[0]).toEqual(expect.objectContaining({ authMethod: null }));
    });
});

describe('OAuth2Authorization access policy gate (plan 052)', () => {
    const realmId = randomUUID();
    const userId = randomUUID();

    let sessionManager: FakeSessionManager;

    class StubAccessPolicyEvaluator implements IOAuth2AccessPolicyEvaluator {
        public calls: { policyId: string, subject: IdentityPolicyData }[] = [];

        public allowed = false;

        async evaluate(policyId: string, subject: IdentityPolicyData): Promise<boolean> {
            this.calls.push({ policyId, subject });
            return this.allowed;
        }
    }

    const identity: UserIdentity = {
        type: OAuth2SubKind.USER,
        data: {
            id: userId,
            name: 'user',
            realm_id: realmId,
            realm: { id: realmId, name: 'master' },
        } as UserIdentity['data'],
    };

    const buildClient = (data: Partial<Client> = {}): Client => {
        const now = new Date().toISOString();
        return {
            id: randomUUID(),
            active: true,
            built_in: false,
            is_confidential: false,
            name: 'client',
            display_name: null,
            description: null,
            secret: null,
            secret_hashed: false,
            secret_encrypted: false,
            redirect_uri: 'https://example.com/**',
            post_logout_redirect_uri: null,
            grant_types: null,
            scope: null,
            base_url: null,
            root_url: null,
            access_policy_id: null,
            access_policy: null,
            created_at: now,
            updated_at: now,
            realm_id: realmId,
            realm: {
                id: realmId,
                name: 'master',
                display_name: null,
                description: null,
                built_in: true,
                created_at: now,
                updated_at: now,
            },
            ...data,
        };
    };

    const buildData = (extra: Record<string, any> = {}) => ({
        response_type: OAuth2AuthorizationResponseType.CODE,
        client_id: randomUUID(),
        realm_id: realmId,
        redirect_uri: 'https://example.com/callback',
        scope: ScopeName.GLOBAL,
        state: 'xyz',
        ...extra,
    });

    beforeEach(() => {
        issueCalls.length = 0;
        sessionManager = new FakeSessionManager();
    });

    it('should deny with the verified redirect target on the error when redirectUriVerified', async () => {
        const evaluator = new StubAccessPolicyEvaluator();
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            accessPolicyEvaluator: evaluator,
        });
        const client = buildClient({ access_policy_id: randomUUID() });

        expect.assertions(6);
        try {
            await authorization.authorize(buildData(), identity, {
                client,
                redirectUriVerified: true,
            });
        } catch (e) {
            expect(isOAuth2AccessDeniedError(e)).toBe(true);
            if (isOAuth2AccessDeniedError(e)) {
                expect(e.code).toEqual(ErrorCode.OAUTH_ACCESS_DENIED);
                expect(e.redirectUri).toEqual('https://example.com/callback');
                expect(e.state).toEqual('xyz');
            }
        }

        expect(evaluator.calls).toHaveLength(1);
        expect(issueCalls).toHaveLength(0);
    });

    it('should deny without a redirect target when the redirect_uri is unverified', async () => {
        const evaluator = new StubAccessPolicyEvaluator();
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            accessPolicyEvaluator: evaluator,
        });
        const client = buildClient({ access_policy_id: randomUUID() });

        expect.assertions(3);
        try {
            await authorization.authorize(buildData(), identity, {
                client,
                redirectUriVerified: false,
            });
        } catch (e) {
            expect(isOAuth2AccessDeniedError(e)).toBe(true);
            if (isOAuth2AccessDeniedError(e)) {
                expect(e.redirectUri).toBeNull();
                expect(e.state).toBeNull();
            }
        }
    });

    it('should issue a code when the policy permits the identity', async () => {
        const evaluator = new StubAccessPolicyEvaluator();
        evaluator.allowed = true;
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            accessPolicyEvaluator: evaluator,
        });
        const policyId = randomUUID();
        const client = buildClient({ access_policy_id: policyId });

        const result = await authorization.authorize(buildData(), identity, {
            client,
            redirectUriVerified: true,
        });

        expect(result.authorizationCode).toBeDefined();
        expect(evaluator.calls).toHaveLength(1);
        expect(evaluator.calls[0].policyId).toEqual(policyId);
        expect(evaluator.calls[0].subject).toEqual(expect.objectContaining({
            type: OAuth2SubKind.USER,
            id: userId,
            realmId,
        }));
    });

    it('should never invoke the evaluator for a client without an access policy (default allow)', async () => {
        const evaluator = new StubAccessPolicyEvaluator();
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            accessPolicyEvaluator: evaluator,
        });

        const result = await authorization.authorize(buildData(), identity, {
            client: buildClient({ access_policy_id: null }),
            redirectUriVerified: true,
        });

        expect(result.authorizationCode).toBeDefined();
        expect(evaluator.calls).toHaveLength(0);
    });

    it('should never invoke the evaluator when no client is threaded', async () => {
        const evaluator = new StubAccessPolicyEvaluator();
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            accessPolicyEvaluator: evaluator,
        });

        const result = await authorization.authorize(buildData(), identity, {});

        expect(result.authorizationCode).toBeDefined();
        expect(evaluator.calls).toHaveLength(0);
    });

    it('should deny a policy-carrying client when no evaluator is wired (fail closed)', async () => {
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
        });
        const client = buildClient({ access_policy_id: randomUUID() });

        await expect(
            authorization.authorize(buildData(), identity, { client, redirectUriVerified: true }),
        ).rejects.toMatchObject({ code: ErrorCode.OAUTH_ACCESS_DENIED });
    });

    it('should record the denied metrics outcome and the AUTHORIZE_FAILED event', async () => {
        const metrics = new FakeAuthFlowMetrics();
        const eventService = new FakeEventService();
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            metrics,
            eventService,
        });
        const client = buildClient({ access_policy_id: randomUUID() });

        await expect(
            authorization.authorize(buildData(), identity, { client, redirectUriVerified: true }),
        ).rejects.toMatchObject({ code: ErrorCode.OAUTH_ACCESS_DENIED });

        expect(metrics.authorizeCalls).toEqual(['denied']);
        expect(eventService.recordCalls).toHaveLength(1);
        expect(eventService.recordCalls[0]).toEqual(expect.objectContaining({
            name: EventName.AUTHORIZE_FAILED,
            refId: client.id,
            actorId: userId,
            data: { reason: 'accessPolicy' },
        }));
    });

    it('should enforce the MFA backstop before the access policy gate (gate order)', async () => {
        const evaluator = new StubAccessPolicyEvaluator();
        const mfaChallengeProvider: IUserAuthenticatorChallengeProvider = {
            challenge: async () => ({
                required: true,
                enrollmentRequired: false,
                kinds: [],
            }),
        };
        const authorization = new OAuth2Authorization({
            codeIssuer,
            sessionManager,
            mfaChallengeProvider,
            accessPolicyEvaluator: evaluator,
        });
        const client = buildClient({ access_policy_id: randomUUID() });

        // a denial is only revealed to a fully-authenticated (incl. second
        // factor) identity — the MFA error must win over the policy denial
        await expect(
            authorization.authorize(buildData(), identity, { client, redirectUriVerified: true }),
        ).rejects.toMatchObject({ code: ErrorCode.OAUTH_MFA_REQUIRED });

        expect(evaluator.calls).toHaveLength(0);
    });
});
