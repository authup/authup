/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { JWTError, OAuth2GrantError } from '@authup/specs';
import { EventName, EventRefType, EventScope } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { ISessionTokenRepository } from '../session-token/index.ts';
import type { IOAuth2TokenIssuer, IOAuth2TokenRepository, IOAuth2TokenVerifier } from '../token/index.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { IOAuth2Grant, OAuth2GrantRunWIthOptions, OAuth2RefreshTokenGrantContext } from './types.ts';

export class OAuth2RefreshTokenGrant extends OAuth2BaseGrant<string | OAuth2TokenPayload> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected tokenVerifier : IOAuth2TokenVerifier;

    protected tokenRepository : IOAuth2TokenRepository;

    protected sessionTokenRepository : ISessionTokenRepository;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    protected logger? : Logger;

    protected gracePeriod : number;

    constructor(ctx: OAuth2RefreshTokenGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRepository = ctx.tokenRepository;
        this.sessionTokenRepository = ctx.sessionTokenRepository;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
        this.logger = ctx.logger;
        this.gracePeriod = ctx.options?.gracePeriod ?? 0;
    }

    async runWith(
        input: string | OAuth2TokenPayload,
        options: OAuth2GrantRunWIthOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        let payload : OAuth2TokenPayload;
        if (typeof input === 'string') {
            // The auth_session_tokens row — not the cache blocklist — is the
            // authority for refresh-token validity, so skip the active check.
            payload = await this.tokenVerifier.verify(input, { skipActiveCheck: true });
        } else {
            payload = input;
        }

        if (!payload.jti) {
            throw JWTError.payloadPropertyInvalid('jti');
        }
        if (!payload.session_id) {
            throw JWTError.payloadPropertyInvalid('session_id');
        }

        const row = await this.sessionTokenRepository.findOneById(payload.jti);
        if (!row || row.kind !== 'refresh') {
            // Row missing = expired-and-swept or a pre-rotation legacy token
            // (hard cutover). Either way the client must re-authenticate.
            throw OAuth2GrantError.invalid('refresh token is unknown');
        }
        if (row.revoked_at) {
            throw OAuth2GrantError.invalid('refresh token has been revoked');
        }
        if (row.session_id !== payload.session_id) {
            // The row is written with the token's own session_id and jti is
            // globally unique, so a mismatch means corruption / jti reuse — fail
            // closed rather than refresh or revoke against the wrong session.
            throw OAuth2GrantError.invalid('refresh token session mismatch');
        }

        const now = new Date();
        const nowISO = now.toISOString();

        const consumed = await this.sessionTokenRepository.markRefreshConsumed(payload.jti, nowISO);
        if (!consumed) {
            // Lost the atomic consume — either a replay of an already-rotated
            // token, or a benign concurrent-refresh race the grace window
            // absorbs.
            const withinGrace = await this.isWithinGraceWindow(payload.jti, now);
            if (!withinGrace) {
                await this.revokeFamily(row.session_id, payload.jti, nowISO);
                throw OAuth2GrantError.invalid('refresh token replay detected; session revoked');
            }
        }

        // Blocklist the presented refresh token in the cache so introspection
        // reports it inactive. Deliberately NOT a DB revoke — that would set
        // revoked_at and break the grace window.
        await this.tokenRepository.setInactive(payload.jti, payload.exp);

        const session = await this.sessionManager.findOneById(payload.session_id);
        if (!session) {
            throw JWTError.payloadPropertyInvalid('session_id');
        }

        await this.sessionManager.verify(session);

        if (options.userAgent) {
            session.user_agent = options.userAgent;
        }
        if (options.ipAddress) {
            session.ip_address = options.ipAddress;
        }
        await this.sessionManager.refresh(session);

        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue({
            ...payload,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            exp: this.refreshTokenIssuer.buildExp(),
            parent_id: payload.jti,
        });

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue({
            ...payload,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            exp: this.accessTokenIssuer.buildExp(),
            refresh_token_id: refreshTokenPayload.jti,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }

    /**
     * The grace window (opt-in via `tokenRefreshGracePeriod`) absorbs benign
     * concurrent / multi-tab refreshes of the SAME still-current token. It is
     * scoped to the chain tip: a token whose descendant has already been
     * consumed is a stale ancestor (a real replay), never a grace re-use.
     */
    protected async isWithinGraceWindow(jti: string, now: Date) : Promise<boolean> {
        if (this.gracePeriod <= 0) {
            return false;
        }

        const current = await this.sessionTokenRepository.findOneById(jti);
        if (
            !current ||
            current.revoked_at !== null ||
            current.consumed_at === null ||
            (now.getTime() - new Date(current.consumed_at).getTime()) > this.gracePeriod * 1_000
        ) {
            return false;
        }

        // Grace applies ONLY to the most-recent consumed token: a consumed
        // descendant proves the rotation advanced past this one (stale replay).
        const chainAdvanced = await this.sessionTokenRepository.hasConsumedChild(jti);
        return !chainAdvanced;
    }

    /**
     * RFC 6819 §5.2.2.3 reaction strategy — revoke the whole token family
     * (the auth_sessions row) on replay: soft-revoke every session-token row,
     * blocklist their jtis in the cache, and delete the session so its access
     * tokens stop verifying on authup's own API.
     */
    protected async revokeFamily(sessionId: string, jti: string, at: string) : Promise<void> {
        this.logger?.warn('OAuth2 refresh token replay detected; revoking session', {
            session_id: sessionId,
            jti,
        });

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.REFRESH_REPLAY_DETECTED,
            refType: EventRefType.SESSION,
            refId: sessionId,
            data: { jti },
        });
        this.metrics?.recordRefreshReplay();

        // Blocklisting is best-effort (cache) — settle all of them so one cache
        // failure cannot skip the rest or, worse, abort the session delete
        // below (the load-bearing part of the revocation). Pin each TTL to the
        // token's real expiry (unix seconds) so a long-lived refresh token
        // cannot resurface as active via introspection after the fallback 1h.
        const rows = await this.sessionTokenRepository.revokeBySessionId(sessionId, at);
        await Promise.allSettled(rows.map((row) => this.tokenRepository.setInactive(
            row.id,
            Math.floor(new Date(row.expires_at).getTime() / 1_000),
        )));

        await this.sessionManager.revoke(sessionId);
    }
}
