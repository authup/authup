/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { OAuth2GrantError, OAuth2SubKind, OAuth2TokenGrant } from '@authup/specs';
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

        // One expiration instant for BOTH artifacts — the pending session
        // lives exactly as long as the ticket (an abandoned login
        // self-expires and is swept with the regular session sweep;
        // completion extends it to the full lifetime). Computed once so
        // the two cannot drift.
        const expiresAt = this.ticketIssuer.buildExp();

        const session = await this.sessionManager.create({
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: user.realmId,
            // no `clientId`: a USER-subject session, and the column is the
            // client-SUBJECT foreign key. The application rides the ticket
            // and lands on the token rows at completion.
            sub: user.id,
            subKind: IdentityType.USER,
            mfaAt: null,
            authMethod: SessionAuthMethod.PASSWORD,
            expiresAt: new Date(expiresAt * 1000).toISOString(),
        });

        // No scope, no role claims — the ticket is not a bearer; it only
        // unlocks the challenge routes (which opt in by kind).
        const [token, payload] = await this.ticketIssuer.issue({
            client_id: clientId,
            session_id: session.id,
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            sub: user.id,
            sub_kind: OAuth2SubKind.USER,
            realm_id: user.realmId,
            realm_name: user.realm?.name,
            ...(input.confirmation ? { cnf: input.confirmation } : {}),
            exp: expiresAt,
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

        // mfaAt was stamped inside the verify unit of work, so the claims
        // advertise the completed factor (amr +otp, acr urn:authup:mfa).
        const amrAcr = deriveAmrAcr(session);

        // Single use: atomically claim the ticket BEFORE minting so two
        // concurrent completions (a mixed-kind user presenting two distinct
        // fresh factors) cannot both issue a token pair — `claimInactive` is a
        // set-if-absent write, so exactly one racer wins. The trade-off vs.
        // claiming after minting is that a mint failure burns the ticket — the
        // safer bias for a single-use login credential (the user re-authenticates).
        if (ticket.jti) {
            const claimed = await this.tokenRepository.claimInactive(ticket.jti, ticket.exp);
            if (!claimed) {
                throw OAuth2GrantError.invalid('mfa login ticket has already been used');
            }
        }

        const issuePayload : Partial<OAuth2TokenPayload> = {
            client_id: ticket.client_id ?? undefined,
            session_id: session.id,
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            scope: ScopeName.GLOBAL,
            sub: session.sub,
            sub_kind: OAuth2SubKind.USER,
            realm_id: session.realmId,
            realm_name: ticket.realm_name,
            ...(ticket.cnf ? { cnf: ticket.cnf } : {}),
            ...amrAcr,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            refType: EventRefType.SESSION,
            refId: session.id,
            clientId: ticket.client_id ?? null,
            actorType: IdentityType.USER,
            actorId: session.sub,
            actorName: input.userName ?? null,
            realmId: session.realmId,
            requestIpAddress: session.ipAddress ?? null,
            requestUserAgent: session.userAgent ?? null,
            data: {
                grantType: OAuth2TokenGrant.PASSWORD,
                sessionId: session.id,
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
