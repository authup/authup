/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type {
    OAuth2TokenGrantResponse,
} from '@authup/specs';
import type { IOAuth2TokenIssuer, IOAuth2TokenRevoker, IOAuth2TokenVerifier } from '../token';

export type BaseGrantContext = {
    accessTokenIssuer: IOAuth2TokenIssuer,
};

export type OAuth2AuthorizeGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
};

export type OAuth2IdentityGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
};

export type OAuth2PasswordGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
};

export type OAuth2RefreshTokenGrantContext = BaseGrantContext & {
    refreshTokenIssuer: IOAuth2TokenIssuer,
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRevoker: IOAuth2TokenRevoker
};

export type OAuth2GrantRunWIthOptions = {
    userAgent?: string,
    ipAddress?: string,
};

export interface IOAuth2Grant<T = ObjectLiteral> {
    runWith(data: T, base?: OAuth2GrantRunWIthOptions) : Promise<OAuth2TokenGrantResponse>;
}
