/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    IIdentityResolver,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
} from '../../../../../core';

export type TokenControllerContext = {
    cookieDomain?: string,

    codeVerifier: IOAuth2AuthorizationCodeVerifier,

    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRevoker: IOAuth2TokenRevoker,

    identityResolver: IIdentityResolver
};
