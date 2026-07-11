/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Session } from '@authup/core-kit';
import { AuditEventName, AuditEventRefType, AuditEventScope } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenKind, isOAuth2Error } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2RefreshTokenGrant } from '../../../../../src/core/oauth2/grant-types/refresh-token.ts';
import {
    FakeAuditEventService,
    FakeAuthFlowMetrics,
    FakeOAuth2TokenIssuer,
    FakeOAuth2TokenRepository,
    FakeOAuth2TokenVerifier,
    FakeSessionManager,
    FakeSessionTokenRepository,
} from '../../helpers/index.ts';

describe('OAuth2RefreshTokenGrant', () => {
    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let refreshTokenIssuer: FakeOAuth2TokenIssuer;
    let tokenVerifier: FakeOAuth2TokenVerifier;
    let tokenRepository: FakeOAuth2TokenRepository;
    let sessionTokenRepository: FakeSessionTokenRepository;
    let sessionManager: FakeSessionManager;
    let auditEventService: FakeAuditEventService;
    let metrics: FakeAuthFlowMetrics;

    const realmId = randomUUID();
    const clientId = randomUUID();
    const userId = randomUUID();

    let sessionId: string;
    let refreshJti: string;

    function build(options?: { gracePeriod?: number }) {
        return new OAuth2RefreshTokenGrant({
            accessTokenIssuer,
            refreshTokenIssuer,
            tokenVerifier,
            tokenRepository,
            sessionTokenRepository,
            sessionManager,
            auditEventService,
            metrics,
            options,
        });
    }

    async function seed(kind: 'refresh' | 'access' = 'refresh'): Promise<OAuth2TokenPayload> {
        sessionId = randomUUID();
        refreshJti = randomUUID();

        await sessionManager.create({
            id: sessionId,
            sub: userId,
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
            expires_at: new Date(Date.now() + 100_000).toISOString(),
        } as Partial<Session>);

        await sessionTokenRepository.create({
            id: refreshJti,
            session_id: sessionId,
            kind,
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
            expires_at: new Date(Date.now() + 100_000).toISOString(),
        });

        return {
            jti: refreshJti,
            session_id: sessionId,
            kind: OAuth2TokenKind.REFRESH,
            sub: userId,
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            client_id: clientId,
            exp: Math.floor(Date.now() / 1000) + 100,
        };
    }

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        refreshTokenIssuer = new FakeOAuth2TokenIssuer();
        tokenVerifier = new FakeOAuth2TokenVerifier();
        tokenRepository = new FakeOAuth2TokenRepository();
        sessionTokenRepository = new FakeSessionTokenRepository();
        sessionManager = new FakeSessionManager();
        auditEventService = new FakeAuditEventService();
        metrics = new FakeAuthFlowMetrics();
    });

    it('should rotate on the first refresh and link the new token pair', async () => {
        const payload = await seed();
        const grant = build();

        const response = await grant.runWith(payload);

        expect(response).toHaveProperty('access_token');
        expect(response).toHaveProperty('refresh_token');

        // the presented refresh token row was consumed
        const row = await sessionTokenRepository.findOneById(refreshJti);
        expect(row?.consumed_at).not.toBeNull();

        // exactly one new refresh + access token issued
        expect(refreshTokenIssuer.issueCalls).toHaveLength(1);
        expect(accessTokenIssuer.issueCalls).toHaveLength(1);

        // new refresh token is chain-linked to the consumed one
        expect(refreshTokenIssuer.issueCalls[0].parent_id).toEqual(refreshJti);

        // new access token is linked to the freshly minted refresh token jti
        // (the fake refresh issuer mints a fresh jti inside issue(); the grant
        // threads that jti into the access issuer as refresh_token_id)
        expect(accessTokenIssuer.issueCalls[0].refresh_token_id).toBeTypeOf('string');

        // session slid + old token blocklisted in the cache
        expect(sessionManager.refreshCalls).toHaveLength(1);
        expect(tokenRepository.setInactiveCalls.map((c) => c.id)).toContain(refreshJti);
    });

    it('should revoke the whole session family on replay of a consumed token', async () => {
        const payload = await seed();
        const grant = build();

        // first use consumes the token
        await grant.runWith(payload);

        // replay: the same (now consumed) token again
        let error: unknown;
        try {
            await grant.runWith(payload);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);

        // family revoke fired: every session token soft-revoked + the session deleted
        expect(sessionTokenRepository.revokeBySessionIdCalls.map((c) => c.sessionId))
            .toContain(sessionId);
        expect(sessionManager.revokeCalls).toContain(sessionId);

        // revoked jtis blocklisted in cache
        expect(tokenRepository.setInactiveCalls.map((c) => c.id)).toContain(refreshJti);

        // every blocklist entry pins a real expiry (never the fallback 1h TTL)
        expect(tokenRepository.setInactiveCalls.every((c) => typeof c.exp === 'number')).toBe(true);
    });

    it('should record a refresh_replay_detected audit event and metric on family revocation', async () => {
        const payload = await seed();
        const grant = build();

        // first use consumes the token; the replay trips the family revoke
        await grant.runWith(payload);
        await expect(grant.runWith(payload)).rejects.toBeDefined();

        expect(auditEventService.recordCalls).toHaveLength(1);
        const [record] = auditEventService.recordCalls;
        expect(record.scope).toEqual(AuditEventScope.OAUTH2);
        expect(record.name).toEqual(AuditEventName.REFRESH_REPLAY_DETECTED);
        expect(record.refType).toEqual(AuditEventRefType.SESSION);
        expect(record.refId).toEqual(sessionId);
        expect(record.data).toEqual({ jti: refreshJti });

        expect(metrics.refreshReplayCalls).toEqual(1);
    });

    it('should not record a replay audit event or metric on a clean rotation', async () => {
        const payload = await seed();
        const grant = build();

        await grant.runWith(payload);

        expect(auditEventService.recordCalls).toHaveLength(0);
        expect(metrics.refreshReplayCalls).toEqual(0);
    });

    it('should still revoke the session when a blocklist cache call fails', async () => {
        const payload = await seed();
        const grant = build();

        await grant.runWith(payload);

        // a cache blip on blocklisting must not abort the (load-bearing) session revoke
        tokenRepository.setInactive = async () => {
            throw new Error('cache unavailable');
        };

        await expect(grant.runWith(payload)).rejects.toBeDefined();
        expect(sessionManager.revokeCalls).toContain(sessionId);
    });

    it('should reject when the row session_id does not match the token session_id', async () => {
        const payload = await seed();
        payload.session_id = randomUUID(); // diverges from the stored row's session_id
        const grant = build();

        let error: unknown;
        try {
            await grant.runWith(payload);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);
        // fail closed: neither consume nor family-revoke on a mismatch
        expect(sessionTokenRepository.markRefreshConsumedCalls).toHaveLength(0);
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });

    it('should reject an unknown refresh token (no row) without touching the session', async () => {
        const payload = await seed();
        // present a token whose jti has no row
        payload.jti = randomUUID();
        const grant = build();

        let error: unknown;
        try {
            await grant.runWith(payload);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);
        expect(sessionManager.revokeCalls).toHaveLength(0);
        expect(refreshTokenIssuer.issueCalls).toHaveLength(0);
    });

    it('should reject an already-revoked refresh token without re-revoking the family', async () => {
        const payload = await seed();
        await sessionTokenRepository.revokeById(refreshJti, new Date().toISOString());
        const grant = build();

        let error: unknown;
        try {
            await grant.runWith(payload);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);
        // a deliberate single-token revoke must NOT trigger family revocation
        expect(sessionTokenRepository.revokeBySessionIdCalls).toHaveLength(0);
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });

    it('should reject when the row is not a refresh token', async () => {
        const payload = await seed('access');
        const grant = build();

        let error: unknown;
        try {
            await grant.runWith(payload);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);
        expect(refreshTokenIssuer.issueCalls).toHaveLength(0);
    });

    it('should mint new chain-linked tokens on a grace-window re-use instead of revoking', async () => {
        const payload = await seed();
        const grant = build({ gracePeriod: 60 });

        // first use consumes the token
        await grant.runWith(payload);
        // second use within the grace window (still the chain tip — no consumed child)
        const response = await grant.runWith(payload);

        expect(response).toHaveProperty('refresh_token');
        // two rotations, no family revoke
        expect(refreshTokenIssuer.issueCalls).toHaveLength(2);
        expect(sessionManager.revokeCalls).toHaveLength(0);
        expect(sessionTokenRepository.revokeBySessionIdCalls).toHaveLength(0);
    });

    it('should revoke the family on grace-window replay of a superseded (stale) refresh token', async () => {
        const payload = await seed();
        const grant = build({ gracePeriod: 60 });

        // first use consumes the presented token
        await grant.runWith(payload);

        // the rotation chain advances past it: a consumed descendant now exists
        const childJti = randomUUID();
        await sessionTokenRepository.create({
            id: childJti,
            session_id: sessionId,
            kind: 'refresh',
            parent_id: refreshJti,
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
            expires_at: new Date(Date.now() + 100_000).toISOString(),
        });
        await sessionTokenRepository.markRefreshConsumed(childJti, new Date().toISOString());

        // replaying the now-stale ancestor within the window is NOT graced
        let error: unknown;
        try {
            await grant.runWith(payload);
        } catch (e) {
            error = e;
        }

        expect(isOAuth2Error(error)).toBe(true);
        expect(sessionManager.revokeCalls).toContain(sessionId);
    });

    it('should throw when the payload has no jti', async () => {
        const grant = build();

        await expect(grant.runWith({ session_id: randomUUID() })).rejects.toBeDefined();
    });

    it('should throw when the payload has no session_id', async () => {
        const grant = build();

        await expect(grant.runWith({ jti: randomUUID() })).rejects.toBeDefined();
    });
});
