/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenGrant } from '@authup/specs';
import {
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
    ScopeName,
    SessionAuthMethod,
} from '@authup/core-kit';
import type { IEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import { deriveAmrAcr } from '../authorization/helpers.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { IOAuth2TokenIssuer, IOAuth2TokenRepository } from '../token/index.ts';
import type {
    IOAuth2MfaLoginService,
    OAuth2MfaLoginCompleteInput,
    OAuth2MfaLoginServiceContext,
    OAuth2MfaLoginTicket,
    OAuth2MfaLoginTicketIssueInput,
    OAuth2MfaLoginTicketIssueOptions,
} from './types.ts';

export class OAuth2MfaLoginService implements IOAuth2MfaLoginService {
    protected sessionManager : ISessionManager;

    protected ticketIssuer : IOAuth2TokenIssuer;

    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected tokenRepository : IOAuth2TokenRepository;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    constructor(ctx: OAuth2MfaLoginServiceContext) {
        this.sessionManager = ctx.sessionManager;
        this.ticketIssuer = ctx.ticketIssuer;
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.tokenRepository = ctx.tokenRepository;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
    }

    async issueTicket(
        input: OAuth2MfaLoginTicketIssueInput,
        options: OAuth2MfaLoginTicketIssueOptions = {},
    ) : Promise<OAuth2MfaLoginTicket> {
        const { user } = input;
        const clientId = input.clientId ?? undefined;

        // The pending session lives only as long as the ticket — an
        // abandoned login self-expires and is swept with the regular
        // session sweep. Completion extends it to the full lifetime.
        const session = await this.sessionManager.create({
            user_agent: options.userAgent,
            ip_address: options.ipAddress,
            realm_id: user.realm_id,
            client_id: clientId,
            sub: user.id,
            sub_kind: IdentityType.USER,
            mfa_at: null,
            auth_method: SessionAuthMethod.PASSWORD,
            expires_at: new Date(this.ticketIssuer.buildExp() * 1000).toISOString(),
        });

        // No scope, no role claims — the ticket is not a bearer; it only
        // unlocks the challenge routes (which opt in by kind).
        const [token, payload] = await this.ticketIssuer.issue({
            client_id: clientId,
            session_id: session.id,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: user.realm_id,
            realm_name: user.realm?.name,
        });

        return {
            token,
            expiresIn: payload.exp ?
                payload.exp - Math.floor(Date.now() / 1000) :
                0,
        };
    }

    async complete(input: OAuth2MfaLoginCompleteInput) : Promise<OAuth2TokenGrantResponse> {
        const { ticket } = input;

        // Extend the ticket-scoped pending session to the regular session
        // lifetime — the login is complete now.
        const session = await this.sessionManager.refresh(input.session);

        // mfa_at was stamped inside the verify unit of work, so the claims
        // advertise the completed factor (amr +otp, acr urn:authup:mfa).
        const amrAcr = deriveAmrAcr(session);

        const issuePayload : Partial<OAuth2TokenPayload> = {
            client_id: session.client_id ?? undefined,
            session_id: session.id,
            user_agent: session.user_agent,
            remote_address: session.ip_address,
            scope: ScopeName.GLOBAL,
            sub: session.sub,
            sub_kind: OAuth2SubKind.USER,
            realm_id: session.realm_id,
            realm_name: ticket.realm_name,
            ...amrAcr,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        // Single use: blocklist the ticket jti for its remaining lifetime.
        // Consumed after minting so a mint failure keeps the ticket usable
        // for a retry; concurrent completions are already serialized by the
        // per-user verify lock, and every completion needs a fresh factor.
        if (ticket.jti) {
            await this.tokenRepository.setInactive(ticket.jti, ticket.exp);
        }

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            refType: EventRefType.SESSION,
            refId: session.id,
            clientId: session.client_id ?? null,
            actorType: IdentityType.USER,
            actorId: session.sub,
            actorName: input.userName ?? null,
            realmId: session.realm_id,
            requestIpAddress: session.ip_address ?? null,
            requestUserAgent: session.user_agent ?? null,
            data: {
                grant_type: OAuth2TokenGrant.PASSWORD,
                session_id: session.id,
            },
        });
        this.metrics?.recordLogin('success');

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
