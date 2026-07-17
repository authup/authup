/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session, User } from '@authup/core-kit';
import type {
    OAuth2TokenConfirmation,
    OAuth2TokenGrantResponse,
    OAuth2TokenPayload,
} from '@authup/specs';
import type { IEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IOAuth2TokenIssuer, IOAuth2TokenRepository } from '../token/index.ts';

export type OAuth2MfaLoginTicketIssueInput = {
    user: User,
    clientId?: string | null,
    confirmation?: OAuth2TokenConfirmation,
};

export type OAuth2MfaLoginTicketIssueOptions = {
    ipAddress?: string,
    userAgent?: string,
};

export type OAuth2MfaLoginTicket = {
    token: string,
    expiresIn: number,
};

export type OAuth2MfaLoginCompleteInput = {
    /**
     * The pending session the ticket references — already mfa-stamped by
     * the challenge verify (markMfaVerified runs in the verify unit of
     * work, before completion).
     */
    session: Session,
    /**
     * The verified mfa_token payload the caller authenticated with.
     */
    ticket: OAuth2TokenPayload,
    /**
     * Actor name for the LOGIN security event.
     */
    userName?: string,
};

/**
 * The "MFA-pending" login-ticket seam (issue #3242): the password grant
 * issues a restricted ticket (kind: mfa_token) instead of failing closed
 * when the second factor cannot ride the single POST (email / WebAuthn),
 * and a successful interactive challenge completes the login by minting
 * the full token pair for the now-MFA'd pending session.
 */
export interface IOAuth2MfaLoginService {
    /**
     * Create the pending session (mfaAt: null, ticket-scoped lifetime)
     * and mint the mfa_token bound to it.
     */
    issueTicket(
        input: OAuth2MfaLoginTicketIssueInput,
        options?: OAuth2MfaLoginTicketIssueOptions
    ): Promise<OAuth2MfaLoginTicket>;

    /**
     * Mint the full grant for the completed session, extend it to the
     * regular session lifetime, and consume the ticket (single use).
     */
    complete(input: OAuth2MfaLoginCompleteInput): Promise<OAuth2TokenGrantResponse>;
}

export type OAuth2MfaLoginServiceContext = {
    sessionManager: ISessionManager,
    ticketIssuer: IOAuth2TokenIssuer,
    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    tokenRepository: IOAuth2TokenRepository,
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
};
