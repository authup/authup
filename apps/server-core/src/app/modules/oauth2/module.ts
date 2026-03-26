/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Repository } from 'typeorm';
import { CacheInjectionKey } from '../cache/index.ts';
import type { IContainer } from 'eldin';
import type { IModule } from '../types.ts';
import { ModuleName } from '../constants.ts';

import {
    OAuth2AuthorizationCodeRepository,
    OAuth2AuthorizationStateRepository,
    OAuth2ClientRepository,
    OAuth2KeyRepository,
    OAuth2ScopeRepository, OAuth2TokenRepository,
} from './repositories/index.ts';
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
} from '../../../core/index.ts';
import { OAuth2InjectionToken } from './constants.ts';
import { IdentityInjectionKey } from '../identity/index.ts';
import { ClientEntity, ClientScopeEntity } from '../../../adapters/database/domains/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';

export class OAuth2Module implements IModule {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.OAUTH2;
        this.dependsOn = [ModuleName.DATABASE, ModuleName.CACHE, ModuleName.CONFIG, ModuleName.IDENTITY];
    }

    async start(container: IContainer) : Promise<void> {
        const config = container.resolve(ConfigInjectionKey);

        container.register(OAuth2InjectionToken.ClientRepository, {
            useFactory: (c) => {
                const repository = c.resolve<Repository<ClientEntity>>(ClientEntity);
                return new OAuth2ClientRepository(repository);
            },
        });

        container.register(OAuth2InjectionToken.ScopeRepository, {
            useFactory: (c) => {
                const repository = c.resolve<Repository<ClientScopeEntity>>(ClientScopeEntity);
                return new OAuth2ScopeRepository(repository);
            },
        });

        container.register(OAuth2InjectionToken.AuthorizationCodeRepository, {
            useFactory: (c) => {
                const cache = c.resolve(CacheInjectionKey);
                return new OAuth2AuthorizationCodeRepository(cache);
            },
        });

        container.register(OAuth2InjectionToken.AuthorizationStateRepository, {
            useFactory: (c) => {
                const cache = c.resolve(CacheInjectionKey);
                return new OAuth2AuthorizationStateRepository(cache);
            },
        });

        container.register(OAuth2InjectionToken.TokenRepository, {
            useFactory: (c) => {
                const cache = c.resolve(CacheInjectionKey);
                return new OAuth2TokenRepository(cache);
            },
        });

        container.register(OAuth2InjectionToken.KeyRepository, {
            // todo: cache use here
            useFactory: () => new OAuth2KeyRepository(),
        });

        container.register(OAuth2InjectionToken.TokenSigner, {
            useFactory: (c) => {
                const keyRepository = c.resolve(OAuth2InjectionToken.KeyRepository);
                return new OAuth2TokenSigner(keyRepository);
            },
        });

        // authorization code issuer
        container.register(OAuth2InjectionToken.AuthorizationCodeIssuer, {
            useFactory: (c) => {
                const codeRepository = c.resolve(OAuth2InjectionToken.AuthorizationCodeRepository);

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
                const codeRepository = c.resolve(OAuth2InjectionToken.AuthorizationCodeRepository);

                return new OAuth2AuthorizationCodeVerifier(codeRepository);
            },
        });

        // authorization code request verifier
        container.register(OAuth2InjectionToken.AuthorizationCodeRequestVerifier, {
            useFactory: (c) => {
                const clientRepository = c.resolve(OAuth2InjectionToken.ClientRepository);
                const clientScopeRepository = c.resolve(OAuth2InjectionToken.ScopeRepository);

                return new OAuth2AuthorizationCodeRequestVerifier({
                    clientRepository,
                    scopeRepository: clientScopeRepository,
                });
            },
        });

        container.register(OAuth2InjectionToken.AuthorizationStateManager, {
            useFactory: (c) => {
                const stateRepository = c.resolve(OAuth2InjectionToken.AuthorizationStateRepository);

                return new OAuth2AuthorizationStateManager(stateRepository);
            },
        });

        // token revoker
        container.register(OAuth2InjectionToken.TokenRevoker, {
            useFactory: (c) => {
                const tokenRepository = c.resolve(OAuth2InjectionToken.TokenRepository);
                return new OAuth2TokenRevoker(tokenRepository);
            },
        });

        // token verifier
        container.register(OAuth2InjectionToken.TokenVerifier, {
            useFactory: (c) => {
                const keyRepository = c.resolve(OAuth2InjectionToken.KeyRepository);
                const tokenRepository = c.resolve(OAuth2InjectionToken.TokenRepository);

                return new OAuth2TokenVerifier(keyRepository, tokenRepository);
            },
        });

        // access token issuer
        container.register(OAuth2InjectionToken.AccessTokenIssuer, {
            useFactory: (c) => {
                const tokenRepository = c.resolve(OAuth2InjectionToken.TokenRepository);
                const tokenSigner = c.resolve(OAuth2InjectionToken.TokenSigner);
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
                const tokenRepository = c.resolve(OAuth2InjectionToken.TokenRepository);
                const tokenSigner = c.resolve(OAuth2InjectionToken.TokenSigner);

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
                const repository = c.resolve(OAuth2InjectionToken.TokenRepository);
                const signer = c.resolve(OAuth2InjectionToken.TokenSigner);
                const identityResolver = c.resolve(IdentityInjectionKey.Resolver);

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
