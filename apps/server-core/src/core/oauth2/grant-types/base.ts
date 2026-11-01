/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import { IdentityType, SessionAuthMethod } from '@authup/core-kit';
import type { ObjectLiteral } from '@authup/kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IUserAuthenticatorRequirementProvider, UserAuthenticatorChallengeStatus } from '../../entities/index.ts';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import type { BaseGrantContext, IOAuth2Grant, OAuth2GrantRunWIthOptions } from './types.ts';

export abstract class OAuth2BaseGrant<
    T = ObjectLiteral,
> implements IOAuth2Grant<T> {
    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected sessionManager : ISessionManager;

    protected mfaChallengeProvider? : IUserAuthenticatorRequirementProvider;

    // -----------------------------------------------------

    constructor(ctx: BaseGrantContext) {
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.sessionManager = ctx.sessionManager;
        this.mfaChallengeProvider = ctx.mfaChallengeProvider;
    }

    // -----------------------------------------------------

    /**
     * A login decides whether a second factor is owed before it inserts its
     * session, and a user's first factor revokes the sessions it finds right
     * after the factor is stored. A session inserted between the two is
     * missed by that revocation, so a just-created session without a factor
     * proof is checked again here and revoked when the user now holds one.
     * Answers the challenge status of a revoked session, otherwise null.
     */
    protected async revokeIfSecondFactorOwed(session: Session): Promise<UserAuthenticatorChallengeStatus | null> {
        if (!this.mfaChallengeProvider ||
            session.subKind !== IdentityType.USER ||
            !session.sub ||
            session.mfaAt ||
            session.authMethod === SessionAuthMethod.EXTERNAL || !await this.mfaChallengeProvider.isChallengeRequired(session.sub)) {
            return null;
        }

        const status = await this.mfaChallengeProvider.challenge(session.sub, { issueMaterial: false });

        if (!status.required) {
            return null;
        }

        await this.sessionManager.revoke(session.id);

        return status;
    }

    // -----------------------------------------------------

    abstract runWith(input: T, options?: OAuth2GrantRunWIthOptions): Promise<OAuth2TokenGrantResponse>;
}
