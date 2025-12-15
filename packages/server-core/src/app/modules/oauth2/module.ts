/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Repository } from 'typeorm';
import type { Config } from '../../../config';
import type {
    IDIContainer,
    IIdentityResolver,
    IOAuth2AuthorizationCodeRepository,
    IOAuth2ClientRepository,
    IOAuth2ClientScopeRepository,
    IOAuth2KeyRepository, IOAuth2TokenRepository,
    IOAuth2TokenSigner,
} from '../../../core';
import type { Module } from '../types';

import {
    OAuth2AuthorizationCodeRepository,
    OAuth2AuthorizationStateRepository,
    OAuth2ClientRepository,
    OAuth2ClientScopeRepository,
    OAuth2KeyRepository, OAuth2TokenRepository,
} from './repositories';
import {
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
import { OAuth2InjectionToken } from './constants';
import { IdentityInjectionKey } from '../identity';
import { ClientEntity, ClientScopeEntity } from '../../../adapters/database/domains';
import { ConfigInjectionKey } from '../config';

export class OAuth2Module implements Module {
    async start(container: IDIContainer) : Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        container.register(OAuth2InjectionToken.ClientRepository, {
            useFactory: (c) => {
                const repository = c.resolve<Repository<ClientEntity>>(ClientEntity);
                return new OAuth2ClientRepository(repository);
            },
        });

        container.register(OAuth2InjectionToken.ClientScopeRepository, {
            useFactory: (c) => {
                const repository = c.resolve<Repository<ClientScopeEntity>>(ClientScopeEntity);
                return new OAuth2ClientScopeRepository(repository);
            },
        });

        container.register(OAuth2InjectionToken.AuthorizationCodeRepository, {
            // todo: cache use here
            useFactory: () => new OAuth2AuthorizationCodeRepository(),
        });

        container.register(OAuth2InjectionToken.AuthorizationStateRepository, {
            // todo: cache use here
            useFactory: () => new OAuth2AuthorizationStateRepository(),
        });

        container.register(OAuth2InjectionToken.TokenRepository, {
            // todo: cache use here
            useFactory: () => new OAuth2TokenRepository(),
        });

        container.register(OAuth2InjectionToken.KeyRepository, {
            // todo: cache use here
            useFactory: () => new OAuth2KeyRepository(),
        });

        container.register(OAuth2InjectionToken.TokenSigner, {
            useFactory: (c) => {
                const keyRepository = c.resolve<IOAuth2KeyRepository>(OAuth2InjectionToken.KeyRepository);
                return new OAuth2TokenSigner(keyRepository);
            },
        });

        // authorization code issuer
        container.register(OAuth2InjectionToken.AuthorizationCodeIssuer, {
            useFactory: (c) => {
                const codeRepository = c.resolve<IOAuth2AuthorizationCodeRepository>(
                    OAuth2InjectionToken.AuthorizationCodeRepository,
                );

                return new OAuth2AuthorizationCodeIssuer(
                    codeRepository,
                    {
                        // todo: own constant here
                        maxAge: config.tokenAccessMaxAge,
                    },
                );
            },
        });
        container.register(OAuth2InjectionToken.AuthorizationCodeVerifier, {
            useFactory: (c) => {
                const codeRepository = c.resolve<IOAuth2AuthorizationCodeRepository>(
                    OAuth2InjectionToken.AuthorizationCodeRepository,
                );

                return new OAuth2AuthorizationCodeVerifier(codeRepository);
            },
        });

        // authorization code request verifier
        container.register(OAuth2InjectionToken.AuthorizationCodeRequestVerifier, {
            useFactory: (c) => {
                const clientRepository = c.resolve<IOAuth2ClientRepository>(
                    OAuth2InjectionToken.ClientRepository,
                );
                const clientScopeRepository = c.resolve<IOAuth2ClientScopeRepository>(
                    OAuth2InjectionToken.ClientScopeRepository,
                );

                return new OAuth2AuthorizationCodeRequestVerifier({
                    clientRepository,
                    clientScopeRepository,
                });
            },
        });

        container.register(OAuth2InjectionToken.AuthorizationStateManager, {
            useFactory: (c) => {
                const stateRepository = c.resolve<OAuth2AuthorizationStateRepository>(
                    OAuth2InjectionToken.AuthorizationStateRepository,
                );

                return new OAuth2AuthorizationStateManager(stateRepository);
            },
        });

        // token revoker
        container.register(OAuth2InjectionToken.TokenRevoker, {
            useFactory: (c) => {
                const tokenRepository = c.resolve<IOAuth2TokenRepository>(OAuth2InjectionToken.TokenRepository);
                return new OAuth2TokenRevoker(tokenRepository);
            },
        });

        // token verifier
        container.register(OAuth2InjectionToken.TokenVerifier, {
            useFactory: (c) => {
                const keyRepository = c.resolve<IOAuth2KeyRepository>(OAuth2InjectionToken.KeyRepository);
                const tokenRepository = c.resolve<IOAuth2TokenRepository>(OAuth2InjectionToken.TokenRepository);

                return new OAuth2TokenVerifier(keyRepository, tokenRepository);
            },
        });

        // access token issuer
        container.register(OAuth2InjectionToken.AccessTokenIssuer, {
            useFactory: (c) => {
                const tokenRepository = c.resolve<IOAuth2TokenRepository>(OAuth2InjectionToken.TokenRepository);
                const tokenSigner = c.resolve<IOAuth2TokenSigner>(OAuth2InjectionToken.TokenSigner);
                return new OAuth2AccessTokenIssuer(
                    tokenRepository,
                    tokenSigner,
                    {
                        maxAge: config.tokenAccessMaxAge,
                        issuer: config.publicUrl,
                    },
                );
            },
        });

        // refresh token issuer
        container.register(OAuth2InjectionToken.RefreshTokenIssuer, {
            useFactory: (c) => {
                const tokenRepository = c.resolve<IOAuth2TokenRepository>(OAuth2InjectionToken.TokenRepository);
                const tokenSigner = c.resolve<IOAuth2TokenSigner>(OAuth2InjectionToken.TokenSigner);

                return new OAuth2RefreshTokenIssuer(
                    tokenRepository,
                    tokenSigner,
                    {
                        maxAge: config.tokenRefreshMaxAge,
                        issuer: config.publicUrl,
                    },
                );
            },
        });

        // open-id token issuer
        container.register(OAuth2InjectionToken.OpenIDTokenIssuer, {
            useFactory: (c) => {
                const repository = c.resolve<IOAuth2TokenRepository>(
                    OAuth2InjectionToken.TokenRepository,
                );
                const signer = c.resolve<IOAuth2TokenSigner>(OAuth2InjectionToken.TokenSigner);
                const identityResolver = c.resolve<IIdentityResolver>(
                    IdentityInjectionKey.Resolver,
                );

                return new OAuth2OpenIDTokenIssuer({
                    repository,
                    signer,

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
