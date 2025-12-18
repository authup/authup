/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import type {
    ICredentialsAuthenticator,
    IIdentityResolver,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
} from '../../../../../core';

export type TokenControllerOptions = {
    cookieDomains: string[]
};

export type TokenControllerContext = {
    options: TokenControllerOptions,
    cookieDomain?: string,

    codeVerifier: IOAuth2AuthorizationCodeVerifier,

    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRevoker: IOAuth2TokenRevoker,

    identityResolver: IIdentityResolver,

    clientAuthenticator: ICredentialsAuthenticator<Client>
    robotAuthenticator: ICredentialsAuthenticator<Robot>
    userAuthenticator: ICredentialsAuthenticator<User>
};
