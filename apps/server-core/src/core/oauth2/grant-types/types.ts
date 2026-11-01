/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { OAuth2TokenConfirmation, OAuth2TokenGrantResponse } from '@authup/specs';
import type { Logger } from '@authup/server-kit';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IIdentityResolver } from '../../identity/resolver/types.ts';
import type { IEventService, IUserAuthenticatorRequirementProvider } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import type { IKeyStore } from '../../key/index.ts';
import type { IOAuth2MfaLoginService } from '../mfa-login/types.ts';
import type { ISessionTokenRepository } from '../session-token/index.ts';
import type {
    IOAuth2OpenIDTokenIssuer,
    IOAuth2TokenIssuer,
    IOAuth2TokenRepository,
    IOAuth2TokenVerifier,
} from '../token/index.ts';

export type BaseGrantContext = {
    accessTokenIssuer: IOAuth2TokenIssuer,
    sessionManager: ISessionManager,
    /**
     * Re-checks a just-created user session for a second factor stored
     * concurrently with the login (absent = no re-check). Required by the
     * grants that create interactive user sessions.
     */
    mfaChallengeProvider?: IUserAuthenticatorRequirementProvider,
};

export type OAuth2AuthorizeGrantContext = BaseGrantContext & {
    mfaChallengeProvider: IUserAuthenticatorRequirementProvider,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2OpenIDTokenIssuer,
    /**
     * The realm's signing key determines the id_token's JWS alg — and with it
     * the at_hash digest (OIDC Core §3.1.3.6).
     */
    keyStore: IKeyStore,
    identityResolver: IIdentityResolver,
};

export type OAuth2IdentityGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
};

export type OAuth2PasswordGrantContext = BaseGrantContext & {
    mfaChallengeProvider: IUserAuthenticatorRequirementProvider,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
    /**
     * Issues the MFA-pending ticket an mfa_required answer carries for the
     * interactive kinds (absent = no ticket).
     */
    mfaLoginService?: IOAuth2MfaLoginService,
    logger?: Logger,
};

export type OAuth2RefreshTokenGrantOptions = {
    /**
     * Grace period (seconds) during which a just-consumed refresh token still
     * mints new chain-linked tokens instead of triggering replay detection.
     * default: 0 (strict).
     */
    gracePeriod?: number,
};

export type OAuth2RefreshTokenGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
    identityResolver: IIdentityResolver,
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRepository: IOAuth2TokenRepository,
    sessionTokenRepository: ISessionTokenRepository,
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
    logger?: Logger,
    options?: OAuth2RefreshTokenGrantOptions,
};

export type OAuth2GrantRunWIthOptions = {
    userAgent?: string,
    ipAddress?: string,
    confirmation?: OAuth2TokenConfirmation,
};

export interface IOAuth2Grant<T = ObjectLiteral> {
    runWith(data: T, base?: OAuth2GrantRunWIthOptions) : Promise<OAuth2TokenGrantResponse>;
}
