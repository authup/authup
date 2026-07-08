/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { Logger } from '@authup/server-kit';
import type { ISessionManager } from '../../authentication/index.ts';
import type { ISessionTokenRepository } from '../session-token/index.ts';
import type {
    IOAuth2OpenIDTokenIssuer, 
    IOAuth2TokenIssuer, 
    IOAuth2TokenRepository, 
    IOAuth2TokenVerifier,
} from '../token/index.ts';

export type BaseGrantContext = {
    accessTokenIssuer: IOAuth2TokenIssuer,
    sessionManager: ISessionManager
};

export type OAuth2AuthorizeGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2OpenIDTokenIssuer,
};

export type OAuth2IdentityGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
};

export type OAuth2PasswordGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
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
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRepository: IOAuth2TokenRepository,
    sessionTokenRepository: ISessionTokenRepository,
    logger?: Logger,
    options?: OAuth2RefreshTokenGrantOptions,
};

export type OAuth2GrantRunWIthOptions = {
    userAgent?: string,
    ipAddress?: string,
};

export interface IOAuth2Grant<T = ObjectLiteral> {
    runWith(data: T, base?: OAuth2GrantRunWIthOptions) : Promise<OAuth2TokenGrantResponse>;
}
