/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import type {
    IIdentityResolver,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2OpenIDTokenIssuer,
    IOAuth2TokenIssuer,
} from '../../../../../core';
import {
    IDENTITY_RESOLVER_TOKEN,
    OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN,
} from '../../../../../core';
import { AuthorizeController } from './module';

export function createHTTPAuthorizeController() {
    const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN);
    const openIdTokenIssuer = container.resolve<IOAuth2OpenIDTokenIssuer>(OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN);

    const codeIssuer = container.resolve<IOAuth2AuthorizationCodeIssuer>(
        OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN,
    );
    const codeRequestVerifier = container.resolve<IOAuth2AuthorizationCodeRequestVerifier>(
        OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    );

    const identityResolver = container.resolve<IIdentityResolver>(IDENTITY_RESOLVER_TOKEN);

    return new AuthorizeController({
        accessTokenIssuer,
        openIdTokenIssuer,

        codeIssuer,
        codeRequestVerifier,

        identityResolver,
    });
}
