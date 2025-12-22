/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import { decorators } from '@routup/decorators';
import { useRequestBody } from '@routup/basic/body';
import { useRequestCookie, useRequestCookies } from '@routup/basic/cookie';
import { useRequestQuery } from '@routup/basic/query';
import type { User } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { UserEntity } from '../../../../adapters/database/domains';
import {
    ClientController,
    ClientPermissionController,
    ClientRoleController,
    ClientScopeController, IdentityProviderController,
    OAuth2ProviderRoleController,
    PermissionController,
    PolicyController,
    RealmController,
    RobotController,
    RobotPermissionController,
    RobotRoleController,
    RoleAttributeController,
    RoleController,
    RolePermissionController,
    ScopeController,
    UserAttributeController,
    UserController,
    UserPermissionController,
    UserRoleController,
} from '../../../../adapters/http';
import {
    ActivateController,
    AuthorizeController,
    JwkController,
    OpenIDController,
    PasswordForgotController,
    PasswordResetController,
    RegisterController,
    StatusController,
    TokenController,
} from '../../../../adapters/http/controllers';
import type {
    ICredentialsAuthenticator,
    IDIContainer,
    IIdentityProviderAccountManager,
    IIdentityResolver, IMailClient,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationCodeVerifier,
    IOAuth2AuthorizationStateManager,
    IOAuth2OpenIDTokenIssuer,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier, ISessionManager,
} from '../../../../core';
import {
    ClientAuthenticator,
    CredentialsAuthenticator,
    RobotAuthenticator,
    UserAuthenticator,
} from '../../../../core';
import { AuthenticationInjectionKey } from '../../authentication';
import { OAuth2InjectionToken } from '../../oauth2';
import { IdentityInjectionKey } from '../../identity';
import type { Config } from '../../config';
import { ConfigInjectionKey } from '../../config';
import { MailInjectionKey } from '../../mail';

export class HTTPControllerModule {
    async mount(router: Router, container: IDIContainer): Promise<void> {
        router.use(decorators({
            controllers: [
                this.createAuthorize(container),
                this.createToken(container),
                JwkController,
                this.createOpenIDController(container),
                this.createActivateController(container),
                this.createPasswordForgotController(container),
                this.createPasswordResetController(container),
                this.createRegisterController(container),

                StatusController,

                ClientController,
                ClientPermissionController,
                ClientRoleController,
                ClientScopeController,
                OAuth2ProviderRoleController,
                this.createIdentityProvider(container),
                PermissionController,
                PolicyController,
                RobotController,
                RobotPermissionController,
                RobotRoleController,
                this.createRealmController(container),
                RoleController,
                RoleAttributeController,
                RolePermissionController,
                ScopeController,
                UserController,
                UserAttributeController,
                UserPermissionController,
                UserRoleController,
            ],
            parameter: {
                body: (context, name) => {
                    if (name) {
                        return useRequestBody(context.request, name);
                    }

                    return useRequestBody(context.request);
                },
                cookie: (context, name) => {
                    if (name) {
                        return useRequestCookie(context.request, name);
                    }

                    return useRequestCookies(context.request);
                },
                query: (context, name) => {
                    if (name) {
                        return useRequestQuery(context.request, name);
                    }

                    return useRequestQuery(context.request);
                },
            },
        }));
    }

    // ----------------------------------------------------

    createAuthorize(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAuth2InjectionToken.AccessTokenIssuer);
        const openIdTokenIssuer = container.resolve<IOAuth2OpenIDTokenIssuer>(OAuth2InjectionToken.OpenIDTokenIssuer);

        const codeIssuer = container.resolve<IOAuth2AuthorizationCodeIssuer>(
            OAuth2InjectionToken.AuthorizationCodeIssuer,
        );
        const codeRequestVerifier = container.resolve<IOAuth2AuthorizationCodeRequestVerifier>(
            OAuth2InjectionToken.AuthorizationCodeRequestVerifier,
        );

        const identityResolver = container.resolve<IIdentityResolver>(IdentityInjectionKey.Resolver);

        return new AuthorizeController({
            options: {
                baseURL: config.publicUrl,
            },

            accessTokenIssuer,
            openIdTokenIssuer,

            codeIssuer,
            codeRequestVerifier,

            identityResolver,
        });
    }

    createToken(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);

        const cookieDomains : string[] = [
            new URL(config.publicUrl).hostname,
        ];

        if (config.cookieDomain) {
            cookieDomains.push(config.cookieDomain);
        }

        const sessionManager = container.resolve<ISessionManager>(
            AuthenticationInjectionKey.SessionManager,
        );

        const codeVerifier = container.resolve<IOAuth2AuthorizationCodeVerifier>(
            OAuth2InjectionToken.AuthorizationCodeVerifier,
        );

        const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(
            OAuth2InjectionToken.AccessTokenIssuer,
        );
        const refreshTokenIssuer = container.resolve<IOAuth2TokenIssuer>(
            OAuth2InjectionToken.RefreshTokenIssuer,
        );

        const tokenRevoker = container.resolve<IOAuth2TokenRevoker>(
            OAuth2InjectionToken.TokenRevoker,
        );
        const tokenVerifier = container.resolve<IOAuth2TokenVerifier>(
            OAuth2InjectionToken.TokenVerifier,
        );

        const identityResolver = container.resolve<IIdentityResolver>(
            IdentityInjectionKey.Resolver,
        );
        const identityProviderLdapCollectionAuthenticator = container.resolve<ICredentialsAuthenticator<User>>(
            IdentityInjectionKey.ProviderLdapCollectionAuthenticator,
        );

        const clientAuthenticator = new ClientAuthenticator(identityResolver);
        const robotAuthenticator = new RobotAuthenticator(identityResolver);

        const userAuthenticator = new CredentialsAuthenticator([
            identityProviderLdapCollectionAuthenticator,
            new UserAuthenticator(identityResolver),
        ]);

        return new TokenController({
            options: {
                cookieDomains,
            },

            codeVerifier,

            accessTokenIssuer,
            refreshTokenIssuer,

            tokenVerifier,
            tokenRevoker,

            identityResolver,

            clientAuthenticator,
            robotAuthenticator,
            userAuthenticator,

            sessionManager,
        });
    }

    createOpenIDController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);

        return new OpenIDController({
            baseURL: config.publicUrl,
        });
    }

    createActivateController(container: IDIContainer) {
        const repository = container.resolve<Repository<User>>(UserEntity);

        return new ActivateController({
            repository,
        });
    }

    createPasswordForgotController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const repository = container.resolve<Repository<User>>(UserEntity);
        const mailClient = container.resolve<IMailClient>(MailInjectionKey);

        return new PasswordForgotController({
            mailClient,
            repository,
            options: {
                registration: config.registration,
                emailVerification: config.emailVerification,
            },
        });
    }

    createPasswordResetController(container: IDIContainer) {
        const repository = container.resolve<Repository<User>>(UserEntity);

        return new PasswordResetController({
            repository,
        });
    }

    createRegisterController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const repository = container.resolve<Repository<User>>(UserEntity);
        const mailClient = container.resolve<IMailClient>(MailInjectionKey);

        return new RegisterController({
            mailClient,
            repository,
            options: {
                registration: config.registration,
                emailVerification: config.emailVerification,
            },
        });
    }

    createIdentityProvider(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);

        const cookieDomains : string[] = [
            new URL(config.publicUrl).hostname,
        ];

        if (config.cookieDomain) {
            cookieDomains.push(config.cookieDomain);
        }

        const sessionManager = container.resolve<ISessionManager>(
            AuthenticationInjectionKey.SessionManager,
        );

        const accountManager = container.resolve<IIdentityProviderAccountManager>(
            IdentityInjectionKey.ProviderAccountManager,
        );

        const codeRequestVerifier = container.resolve<IOAuth2AuthorizationCodeRequestVerifier>(
            OAuth2InjectionToken.AuthorizationCodeRequestVerifier,
        );

        const stateManager = container.resolve<IOAuth2AuthorizationStateManager>(
            OAuth2InjectionToken.AuthorizationStateManager,
        );

        const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(
            OAuth2InjectionToken.AccessTokenIssuer,
        );
        const refreshTokenIssuer = container.resolve<IOAuth2TokenIssuer>(
            OAuth2InjectionToken.RefreshTokenIssuer,
        );

        return new IdentityProviderController({
            options: {
                baseURL: config.publicUrl,
                cookieDomains,
                accessTokenMaxAge: config.tokenAccessMaxAge,
                refreshTokenMaxAge: config.tokenRefreshMaxAge,
            },

            accountManager,

            codeRequestVerifier,
            stateManager,

            accessTokenIssuer,
            refreshTokenIssuer,
            sessionManager,
        });
    }

    createRealmController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);

        return new RealmController({
            options: {
                baseURL: config.publicUrl,
            },
        });
    }
}
