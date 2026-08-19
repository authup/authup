/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DContext,
    DController,
    DGet,
    DPost,
    DTags,
} from '@routup/decorators';
import type { Session } from '@authup/core-kit';
import { IdentityType, SessionAuthMethod, UserAuthenticatorKind } from '@authup/core-kit';
import { OAuth2AuthenticationContextClass } from '@authup/specs';
import { useRequestQuery } from '@routup/basic/query';
import { BadRequestError, EntityCredentialsInvalidError, UnauthorizedError } from '@authup/errors';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type {
    UserAuthenticatorChallengeResponse,
    UserAuthenticatorChallengeSendPayload,
    UserAuthenticatorChallengeVerifyPayload,
    UserAuthenticatorChallengeVerifyResponse,
} from '@authup/core-http-kit';
import type { IOAuth2MfaLoginService, ISessionManager, IUserAuthenticatorService } from '../../../../../core/index.ts';
import type { RequestIdentity, RequestMfaLoginTicket } from '../../../request/index.ts';
import {
    useRequestIdentity,
    useRequestLocale,
    useRequestMfaLoginTicket,
    useRequestSessionId,
} from '../../../request/index.ts';

export type AuthenticatorChallengeControllerContext = {
    service: IUserAuthenticatorService,
    sessionManager: ISessionManager,
    mfaLoginService?: IOAuth2MfaLoginService,
};

type ChallengeActor = {
    identity: RequestIdentity,
    ticket: RequestMfaLoginTicket | null,
};

/**
 * Login-time challenge surface, scoped to the CURRENT bearer identity.
 * GET reports whether (and how) the caller must present a second factor;
 * POST verifies a factor and stamps mfa_at onto the backing session so
 * the /authorize backstop passes.
 *
 * Besides a regular access bearer, these routes accept the "MFA-pending"
 * login ticket (kind: mfa_token, issue #3242) the password grant issues
 * for factor kinds that cannot ride the single grant POST (email /
 * WebAuthn). A ticket-authenticated verify additionally completes the
 * login: the response carries the full token grant for the now-MFA'd
 * pending session.
 */
@DTags('userAuthenticator')
@DController('/authenticators/challenge')
export class AuthenticatorChallengeController {
    protected service: IUserAuthenticatorService;

    protected sessionManager: ISessionManager;

    protected mfaLoginService?: IOAuth2MfaLoginService;

    constructor(ctx: AuthenticatorChallengeControllerContext) {
        this.service = ctx.service;
        this.sessionManager = ctx.sessionManager;
        this.mfaLoginService = ctx.mfaLoginService;
    }

    /**
     * Resolve the acting subject: the regular request identity (access
     * bearer — the middleware never sets it for a ticket) or the stashed
     * MFA-pending ticket. Anything else is unauthorized — the previous
     * ForceLoggedInMiddleware contract, widened by exactly one bearer kind.
     */
    protected resolveActor(event: IAppEvent) : ChallengeActor {
        const identity = useRequestIdentity(event);
        if (identity) {
            return { identity, ticket: null };
        }

        const ticket = useRequestMfaLoginTicket(event);
        if (ticket) {
            return { identity: ticket.identity, ticket };
        }

        throw new UnauthorizedError();
    }

    @DGet('')
    async status(
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticatorChallengeResponse> {
        const { identity, ticket } = this.resolveActor(event);
        if (identity.type !== IdentityType.USER) {
            return {
                required: false,
                enrollmentRequired: false,
                kinds: [],
            };
        }

        const status = await this.service.challenge(identity.id);

        // What this SESSION still owes, not merely what the user holds. A
        // session an external identity provider established was authenticated
        // there, which is where MFA is enforced for it, so authup asks for no
        // local factor on top and `mfaRequired` forces no local enrollment.
        //
        // The rule lives here rather than in the page, so the hosted ladder
        // and any other consumer read one answer; `authorizeInner` keeps its
        // own copy as the backstop, which is the point of a backstop.
        //
        // The exception is an application that requested MFA explicitly. The
        // caller passes the `acr_values` it is being asked to satisfy, since
        // only it knows the authorization request.
        const session = ticket ? null : await this.resolveSession(event);
        if (session && session.authMethod === SessionAuthMethod.EXTERNAL) {
            const { acrValues } = useRequestQuery(event);
            const stepUpRequested = typeof acrValues === 'string' &&
                acrValues.split(' ').includes(OAuth2AuthenticationContextClass.MFA);

            if (!stepUpRequested) {
                return {
                    ...status,
                    required: false,
                    enrollmentRequired: false,
                };
            }
        }

        return status;
    }

    protected async resolveSession(event: IAppEvent) : Promise<Session | null> {
        const sessionId = useRequestSessionId(event);
        if (!sessionId) {
            return null;
        }

        return this.sessionManager.findOneById(sessionId);
    }

    @DPost('/send')
    async send(
        @DBody() data: UserAuthenticatorChallengeSendPayload,
        @DContext() event: IAppEvent,
    ): Promise<{ success: true }> {
        const { identity } = this.resolveActor(event);
        if (identity.type !== IdentityType.USER) {
            throw new BadRequestError('Only user identities can request a challenge.');
        }

        if (
            !data ||
            !Object.values(UserAuthenticatorKind).includes(data.kind as UserAuthenticatorKind)
        ) {
            throw new BadRequestError('A kind must be provided.');
        }

        await this.service.sendChallenge(identity.id, data.kind, { locale: useRequestLocale(event) });

        // uniform 200 regardless of whether a code was actually mailed —
        // no enrollment-status oracle for the caller.
        return { success: true };
    }

    @DPost('')
    async verify(
        @DBody() data: UserAuthenticatorChallengeVerifyPayload,
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticatorChallengeVerifyResponse> {
        const { identity, ticket } = this.resolveActor(event);
        if (identity.type !== IdentityType.USER) {
            throw new BadRequestError('Only user identities can complete a challenge.');
        }

        if (
            !data ||
            typeof data.response !== 'string' ||
            !data.response ||
            !Object.values(UserAuthenticatorKind).includes(data.kind as UserAuthenticatorKind)
        ) {
            throw new BadRequestError('A kind and response must be provided.');
        }

        // Bind the proof to the backing session — the /authorize backstop
        // reads session.mfa_at. The session id is server-derived (stashed
        // by the authorization middleware / carried by the verified ticket),
        // never client input. The stamp runs INSIDE the verify unit of work
        // (before the code consumption persists), so a stamp failure never
        // burns a single-use code.
        const sessionId = ticket ?
            ticket.payload.session_id :
            useRequestSessionId(event);
        const session = sessionId ?
            await this.sessionManager.findOneById(sessionId) :
            null;

        // a ticket references exactly one pending session — without it
        // (swept / expired mid-flight) the login can not complete.
        if (ticket && !session) {
            throw new UnauthorizedError();
        }

        const verified = await this.service.verify(
            identity.id,
            {
                kind: data.kind,
                response: data.response,
            },
            {
                ipAddress: getRequestIP(event) ?? null,
                userAgent: getRequestHeader(event, 'user-agent') ?? null,
                clientId: identity.clientId,
                sessionId: sessionId ?? null,
                ...(session ? {
                    onVerified: async () => {
                        await this.sessionManager.markMfaVerified(session);
                    },
                } : {}),
            },
        );
        if (!verified) {
            throw new EntityCredentialsInvalidError();
        }

        // Ticket flow: the factor is verified and mfa_at stamped — complete
        // the login by minting the full grant for the pending session and
        // consuming the ticket (single use).
        if (ticket && session && this.mfaLoginService) {
            const token = await this.mfaLoginService.complete({
                session,
                ticket: ticket.payload,
                userName: identity.data.name,
            });

            return { verified: true, token };
        }

        return { verified: true };
    }
}
