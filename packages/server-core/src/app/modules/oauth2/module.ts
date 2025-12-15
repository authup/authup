/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config } from '../../../config';
import type { DependencyContainer, IIdentityResolver } from '../../../core';
import type { ApplicationModule } from '../types';

import {
    OAuth2ClientRepository,
    OAuth2ClientScopeRepository,
    OAuth2KeyRepository,
    OAuth2TokenRepository,
} from '../../../adapters/database';
import {
    IDENTITY_RESOLVER_TOKEN,

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
} from '../../../core';
import { OAuth2AuthorizationCodeRepository, OAuth2AuthorizationStateRepository } from '../../../adapters';
import { OAuth2InjectionToken } from './constants';

export class OAuth2Module implements ApplicationModule {
    protected container: DependencyContainer;

    // ----------------------------------------------------

    constructor(container: DependencyContainer) {
        this.container = container;
    }

    async start() : Promise<void> {
        const config = this.container.resolve<Config>('config');

        const clientRepository = new OAuth2ClientRepository();
        const clientScopeRepository = new OAuth2ClientScopeRepository();

        const codeRepository = new OAuth2AuthorizationCodeRepository();

        const stateRepository = new OAuth2AuthorizationStateRepository();

        const tokenRepository = new OAuth2TokenRepository();
        const keyRepository = new OAuth2KeyRepository();

        const tokenSigner = new OAuth2TokenSigner(keyRepository);

        // authorization code issuer
        this.container.register(OAuth2InjectionToken.AuthorizationCodeIssuer, {
            useFactory: () => new OAuth2AuthorizationCodeIssuer(
                codeRepository,
                {
                    // todo: own constant here
                    maxAge: config.tokenAccessMaxAge,
                },
            ),
        });
        this.container.register(OAuth2InjectionToken.AuthorizationCodeVerifier, {
            useFactory: () => new OAuth2AuthorizationCodeVerifier(codeRepository),
        });

        // authorization code request verifier
        this.container.register(OAuth2InjectionToken.AuthorizationCodeRequestVerifier, {
            useFactory: () => new OAuth2AuthorizationCodeRequestVerifier({
                clientRepository,
                clientScopeRepository,
            }),
        });

        this.container.register(OAuth2InjectionToken.AuthorizationStateManager, {
            useFactory: () => new OAuth2AuthorizationStateManager(stateRepository),
        });

        // token revoker
        this.container.register(OAuth2InjectionToken.TokenRevoker, {
            useFactory: () => new OAuth2TokenRevoker(tokenRepository),
        });

        // token verifier
        this.container.register(OAuth2InjectionToken.TokenVerifier, {
            useFactory: () => new OAuth2TokenVerifier(keyRepository, tokenRepository),
        });

        // access token issuer
        this.container.register(OAuth2InjectionToken.AccessTokenIssuer, {
            useFactory: () => new OAuth2AccessTokenIssuer(
                tokenRepository,
                tokenSigner,
                {
                    maxAge: config.tokenAccessMaxAge,
                    issuer: config.publicUrl,
                },
            ),
        });

        // refresh token issuer
        this.container.register(OAuth2InjectionToken.RefreshTokenIssuer, {
            useFactory: () => new OAuth2RefreshTokenIssuer(
                tokenRepository,
                tokenSigner,
                {
                    maxAge: config.tokenRefreshMaxAge,
                    issuer: config.publicUrl,
                },
            ),
        });

        // open-id token issuer
        this.container.register(OAuth2InjectionToken.OpenIDTokenIssuer, {
            useFactory: (c) => {
                const identityResolver = c.resolve<IIdentityResolver>(
                    IDENTITY_RESOLVER_TOKEN,
                );
                return new OAuth2OpenIDTokenIssuer({
                    repository: tokenRepository,
                    signer: tokenSigner,

                    identityResolver,

                    options: {
                        // todo: own constant here
                        maxAge: config.tokenAccessMaxAge,
                        issuer: config.publicUrl,
                    },
                });
            },
        });
    }
}
