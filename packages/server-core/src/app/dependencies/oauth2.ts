/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import {
    OAuth2ClientRepository,
    OAuth2ClientScopeRepository,
    OAuth2KeyRepository,
    OAuth2TokenRepository,
} from '../../adapters/database';
import type { IIdentityResolver } from '../../core';
import {
    IDENTITY_RESOLVER_TOKEN, OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_VERIFIER_TOKEN,
    OAUTH2_AUTHORIZATION_STATE_MANAGER_TOKEN,
    OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN,
    OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN,
    OAUTH2_TOKEN_REVOKER_TOKEN,
    OAUTH2_TOKEN_VERIFIER_TOKEN,
    OAuth2AccessTokenIssuer,

    OAuth2AuthorizationCodeIssuer,
    OAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeVerifier,
    OAuth2AuthorizationStateManager,
    OAuth2OpenIDTokenIssuer,
    OAuth2RefreshTokenIssuer,
    OAuth2TokenRevoker,
    OAuth2TokenSigner,
    OAuth2TokenVerifier,
} from '../../core';
import { OAuth2AuthorizationCodeRepository, OAuth2AuthorizationStateRepository } from '../../adapters';

export type OAuth2BootstrapOptions = {
    /**
     * Issuer of tokens.
     */
    issuer: string,
    tokenAccessMaxAge: number,
    tokenRefreshMaxAge: number,
    authorizationCodeMaxAge: number,
    idTokenMaxAge: number
};

export function registerOAuth2Dependencies(options: OAuth2BootstrapOptions) {
    const clientRepository = new OAuth2ClientRepository();
    const clientScopeRepository = new OAuth2ClientScopeRepository();

    const codeRepository = new OAuth2AuthorizationCodeRepository();

    const stateRepository = new OAuth2AuthorizationStateRepository();

    const tokenRepository = new OAuth2TokenRepository();
    const keyRepository = new OAuth2KeyRepository();

    const tokenSigner = new OAuth2TokenSigner(keyRepository);

    // authorization code issuer
    container.register(OAUTH2_AUTHORIZATION_CODE_ISSUER_TOKEN, {
        useFactory: () => new OAuth2AuthorizationCodeIssuer(
            codeRepository,
            {
                maxAge: options.authorizationCodeMaxAge,
            },
        ),
    });
    container.register(OAUTH2_AUTHORIZATION_CODE_VERIFIER_TOKEN, {
        useFactory: () => new OAuth2AuthorizationCodeVerifier(codeRepository),
    });

    // authorization code request verifier
    container.register(OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN, {
        useFactory: () => new OAuth2AuthorizationCodeRequestVerifier({
            clientRepository,
            clientScopeRepository,
        }),
    });

    container.register(OAUTH2_AUTHORIZATION_STATE_MANAGER_TOKEN, {
        useFactory: () => new OAuth2AuthorizationStateManager(stateRepository),
    });

    // token revoker
    container.register(OAUTH2_TOKEN_REVOKER_TOKEN, {
        useFactory: () => new OAuth2TokenRevoker(tokenRepository),
    });

    // token verifier
    container.register(OAUTH2_TOKEN_VERIFIER_TOKEN, {
        useFactory: () => new OAuth2TokenVerifier(keyRepository, tokenRepository),
    });

    // access token issuer
    container.register(OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN, {
        useFactory: () => new OAuth2AccessTokenIssuer(
            tokenRepository,
            tokenSigner,
            {
                maxAge: options.tokenAccessMaxAge,
                issuer: options.issuer,
            },
        ),
    });

    // refresh token issuer
    container.register(OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN, {
        useFactory: () => new OAuth2RefreshTokenIssuer(
            tokenRepository,
            tokenSigner,
            {
                maxAge: options.tokenAccessMaxAge,
                issuer: options.issuer,
            },
        ),
    });

    // open-id token issuer
    container.register(OAUTH2_OPEN_ID_TOKEN_ISSUER_TOKEN, {
        useFactory: (c) => {
            const identityResolver = c.resolve<IIdentityResolver>(
                IDENTITY_RESOLVER_TOKEN,
            );
            return new OAuth2OpenIDTokenIssuer({
                repository: tokenRepository,
                signer: tokenSigner,

                identityResolver,

                options: {
                    maxAge: options.idTokenMaxAge,
                    issuer: options.issuer,
                },
            });
        },
    });
}
