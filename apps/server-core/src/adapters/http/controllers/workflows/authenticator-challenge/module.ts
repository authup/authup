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
import { IdentityType, UserAuthenticatorKind } from '@authup/core-kit';
import { BadRequestError, EntityCredentialsInvalidError } from '@authup/errors';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type {
    UserAuthenticatorChallengeResponse,
    UserAuthenticatorChallengeSendPayload,
    UserAuthenticatorChallengeVerifyPayload,
    UserAuthenticatorChallengeVerifyResponse,
} from '@authup/core-http-kit';
import type { ISessionManager, IUserAuthenticatorService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { useRequestIdentityOrFail, useRequestLocale, useRequestSessionId } from '../../../request/index.ts';

export type AuthenticatorChallengeControllerContext = {
    service: IUserAuthenticatorService,
    sessionManager: ISessionManager,
};

/**
 * Login-time challenge surface, scoped to the CURRENT bearer identity.
 * GET reports whether (and how) the caller must present a second factor;
 * POST verifies a factor and stamps mfa_at onto the backing session so
 * the /authorize backstop passes.
 */
@DTags('userAuthenticator')
@DController('/authenticators/challenge')
export class AuthenticatorChallengeController {
    protected service: IUserAuthenticatorService;

    protected sessionManager: ISessionManager;

    constructor(ctx: AuthenticatorChallengeControllerContext) {
        this.service = ctx.service;
        this.sessionManager = ctx.sessionManager;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async status(
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticatorChallengeResponse> {
        const identity = useRequestIdentityOrFail(event);
        if (identity.type !== IdentityType.USER) {
            return {
                required: false, 
                enrollmentRequired: false, 
                kinds: [], 
            };
        }

        return this.service.challenge(identity.id);
    }

    @DPost('/send', [ForceLoggedInMiddleware])
    async send(
        @DBody() data: UserAuthenticatorChallengeSendPayload,
        @DContext() event: IAppEvent,
    ): Promise<{ success: true }> {
        const identity = useRequestIdentityOrFail(event);
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

    @DPost('', [ForceLoggedInMiddleware])
    async verify(
        @DBody() data: UserAuthenticatorChallengeVerifyPayload,
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticatorChallengeVerifyResponse> {
        const identity = useRequestIdentityOrFail(event);
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

        const verified = await this.service.verify(
            identity.id,
            {
                kind: data.kind,
                response: data.response,
            },
            {
                ipAddress: getRequestIP(event, { trustProxy: true }) ?? null,
                userAgent: getRequestHeader(event, 'user-agent') ?? null,
                clientId: identity.clientId,
            },
        );
        if (!verified) {
            throw new EntityCredentialsInvalidError();
        }

        // Bind the proof to the backing session — the /authorize backstop
        // reads session.mfa_at. The session id is server-derived (stashed
        // by the authorization middleware), never client input.
        const sessionId = useRequestSessionId(event);
        if (sessionId) {
            const session = await this.sessionManager.findOneById(sessionId);
            if (session) {
                await this.sessionManager.markMfaVerified(session);
            }
        }

        return { verified: true };
    }
}
