/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2TokenIssuer,
    OAuth2IdentityResolver,
} from '../../../../../../core';

export type AuthorizeControllerContext = {
    accessTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2TokenIssuer,

    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,

    identityResolver: OAuth2IdentityResolver
};
