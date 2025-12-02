/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import { AuthorizeController } from './authorize';
import { TokenController } from './token';
import type {
    IOAuth2AuthorizationCodeIssuer, IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier, OAuth2IdentityResolver,
} from '../../../../../core';
import {
    OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    OAUTH2_IDENTITY_RESOLVER_TOKEN,
    OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN,
    OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN,
    OAUTH2_TOKEN_REVOKER_TOKEN,
    OAUTH2_TOKEN_VERIFIER_TOKEN,
} from '../../../../../core';

export function buildOAuth2Controllers() {
    const codeIssuer = container.resolve<IOAuth2AuthorizationCodeIssuer>(
        OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN,
    );
    const codeRequestVerifier = container.resolve<IOAuth2AuthorizationCodeRequestVerifier>(
        OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    );
    const identityResolver = container.resolve<OAuth2IdentityResolver>(OAUTH2_IDENTITY_RESOLVER_TOKEN);

    const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN);
    const refreshTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN);
    const openIdTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN);

    const tokenRevoker = container.resolve<IOAuth2TokenRevoker>(OAUTH2_TOKEN_REVOKER_TOKEN);
    const tokenVerifier = container.resolve<IOAuth2TokenVerifier>(OAUTH2_TOKEN_VERIFIER_TOKEN);

    return [
        new AuthorizeController({
            accessTokenIssuer,
            openIdTokenIssuer,

            codeIssuer,
            codeRequestVerifier,

            identityResolver,
        }),
        new TokenController({
            cookieDomain: 'http://localhost:3000/',

            accessTokenIssuer,
            refreshTokenIssuer,

            tokenVerifier,
            tokenRevoker,
        }),
    ];
}
