/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    IIdentityResolver,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2OpenIDTokenIssuer,
    IOAuth2TokenIssuer,
} from '../../../../../core/index.ts';

export type AuthorizeControllerOptions = {
    baseURL: string;
};

export type AuthorizeControllerContext = {
    options: AuthorizeControllerOptions,

    accessTokenIssuer: IOAuth2TokenIssuer,
    openIdTokenIssuer: IOAuth2OpenIDTokenIssuer,

    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,

    identityResolver: IIdentityResolver
};
