/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import type {
    ICredentialsAuthenticator,
    IIdentityPermissionProvider,
    IIdentityResolver,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker, IOAuth2TokenVerifier, ISessionManager 
} from '../../../../../core/index.ts';

export type TokenControllerContext = {
    codeVerifier: IOAuth2AuthorizationCodeVerifier,

    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,
    tokenVerifier: IOAuth2TokenVerifier,
    tokenRevoker: IOAuth2TokenRevoker,

    sessionManager: ISessionManager,

    identityResolver: IIdentityResolver,
    identityPermissionProvider: IIdentityPermissionProvider,

    clientAuthenticator: ICredentialsAuthenticator<Client>
    robotAuthenticator: ICredentialsAuthenticator<Robot>
    userAuthenticator: ICredentialsAuthenticator<User>
};
