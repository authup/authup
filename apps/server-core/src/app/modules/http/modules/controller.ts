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
import type { DataSource, Repository } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { KeyEntity, UserEntity } from '../../../../adapters/database/domains/index.ts';
import {
    ClientPermissionRepositoryAdapter,
    ClientRepositoryAdapter,
    ClientRoleRepositoryAdapter,
    ClientScopeRepositoryAdapter,
    IdentityProviderRepositoryAdapter,
    IdentityProviderRoleMappingRepositoryAdapter,
    PermissionRepositoryAdapter,
    PolicyRepositoryAdapter,
    RealmRepositoryAdapter,
    RobotPermissionRepositoryAdapter,
    RobotRepositoryAdapter,
    RobotRoleRepositoryAdapter,
    RoleAttributeRepositoryAdapter,
    RolePermissionRepositoryAdapter,
    RoleRepositoryAdapter,
    ScopeRepositoryAdapter,
    UserAttributeRepositoryAdapter,
    UserPermissionRepositoryAdapter,
    UserRepositoryAdapter,
    UserRoleRepositoryAdapter,
} from '../../database/index.ts';
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
} from '../../../../adapters/http/index.ts';
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
} from '../../../../adapters/http/controllers/index.ts';
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
} from '../../../../core/index.ts';
import {
    ClientAuthenticator,
    CredentialsAuthenticator,
    RobotAuthenticator,
    UserAuthenticator,
} from '../../../../core/index.ts';
import { IdentityPermissionService } from '../../../../services/index.ts';
import { AuthenticationInjectionKey } from '../../authentication/index.ts';
import { OAuth2InjectionToken } from '../../oauth2/index.ts';
import { IdentityInjectionKey } from '../../identity/index.ts';
import type { Config } from '../../config/index.ts';
import { ConfigInjectionKey } from '../../config/index.ts';
import { MailInjectionKey } from '../../mail/index.ts';

export class HTTPControllerModule {
    async mount(router: Router, container: IDIContainer): Promise<void> {
        const dataSource = await useDataSource();

        const realmController = await this.createRealmController(container);
        const roleController = this.createRoleController(dataSource);
        const permissionController = this.createPermissionController(dataSource);
        const clientController = this.createClientController(dataSource);
        const robotController = this.createRobotController(dataSource);
        const clientPermissionController = this.createClientPermissionController(dataSource);
        const clientRoleController = this.createClientRoleController(dataSource);
        const clientScopeController = this.createClientScopeController(dataSource);
        const robotPermissionController = this.createRobotPermissionController(dataSource);
        const robotRoleController = this.createRobotRoleController(dataSource);
        const roleAttributeController = this.createRoleAttributeController(dataSource);
        const rolePermissionController = this.createRolePermissionController(dataSource);
        const scopeController = this.createScopeController(dataSource);
        const userController = this.createUserController(dataSource);
        const userAttributeController = this.createUserAttributeController(dataSource);
        const userPermissionController = this.createUserPermissionController(dataSource);
        const userRoleController = this.createUserRoleController(dataSource);
        const policyController = this.createPolicyController(dataSource);
        const identityProviderRoleController = this.createIdentityProviderRoleController(dataSource);

        router.use(decorators({
            controllers: [
                this.createAuthorize(container),
                this.createToken(container, dataSource),
                this.createJwkController(dataSource),
                this.createOpenIDController(container),
                this.createActivateController(container),
                this.createPasswordForgotController(container),
                this.createPasswordResetController(dataSource),
                this.createRegisterController(container, dataSource),

                StatusController,

                clientController,
                clientPermissionController,
                clientRoleController,
                clientScopeController,
                identityProviderRoleController,
                await this.createIdentityProvider(container, dataSource),
                permissionController,
                policyController,
                robotController,
                robotPermissionController,
                robotRoleController,
                realmController,
                roleController,
                roleAttributeController,
                rolePermissionController,
                scopeController,
                userController,
                userAttributeController,
                userPermissionController,
                userRoleController,
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

    createToken(container: IDIContainer, dataSource: DataSource) {
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

        const identityPermissionService = new IdentityPermissionService(dataSource);

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
            identityPermissionService,

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

    createPasswordResetController(dataSource: DataSource) {
        const repository = new UserRepositoryAdapter(dataSource);

        return new PasswordResetController({
            repository,
        });
    }

    createRegisterController(container: IDIContainer, dataSource: DataSource) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const repository = new UserRepositoryAdapter(dataSource);
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

    async createIdentityProvider(container: IDIContainer, dataSource?: any) {
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

        const idpDataSource = dataSource || await useDataSource();
        const repository = new IdentityProviderRepositoryAdapter(idpDataSource);

        return new IdentityProviderController({
            options: {
                baseURL: config.publicUrl,
                cookieDomains,
                accessTokenMaxAge: config.tokenAccessMaxAge,
                refreshTokenMaxAge: config.tokenRefreshMaxAge,
            },

            repository,

            accountManager,

            codeRequestVerifier,
            stateManager,

            accessTokenIssuer,
            refreshTokenIssuer,
            sessionManager,
        });
    }

    createClientController(dataSource: any) {
        const repository = new ClientRepositoryAdapter(dataSource);
        return new ClientController({ repository, dataSource });
    }

    createRobotController(dataSource: any) {
        const repository = new RobotRepositoryAdapter(dataSource);
        return new RobotController({ repository, dataSource });
    }

    createPermissionController(dataSource: any) {
        const repository = new PermissionRepositoryAdapter(dataSource);
        return new PermissionController({ repository, dataSource });
    }

    createRoleController(dataSource: any) {
        const repository = new RoleRepositoryAdapter(dataSource);
        return new RoleController({ repository });
    }

    createClientPermissionController(dataSource: any) {
        const repository = new ClientPermissionRepositoryAdapter(dataSource);
        return new ClientPermissionController({ repository });
    }

    createClientRoleController(dataSource: any) {
        const repository = new ClientRoleRepositoryAdapter(dataSource);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new ClientRoleController({ repository, identityPermissionService });
    }

    createClientScopeController(dataSource: any) {
        const repository = new ClientScopeRepositoryAdapter(dataSource);
        return new ClientScopeController({ repository });
    }

    createRobotPermissionController(dataSource: any) {
        const repository = new RobotPermissionRepositoryAdapter(dataSource);
        return new RobotPermissionController({ repository });
    }

    createRobotRoleController(dataSource: any) {
        const repository = new RobotRoleRepositoryAdapter(dataSource);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new RobotRoleController({ repository, identityPermissionService });
    }

    createRoleAttributeController(dataSource: any) {
        const repository = new RoleAttributeRepositoryAdapter(dataSource);
        return new RoleAttributeController({ repository });
    }

    createRolePermissionController(dataSource: any) {
        const repository = new RolePermissionRepositoryAdapter(dataSource);
        return new RolePermissionController({ repository });
    }

    createScopeController(dataSource: any) {
        const repository = new ScopeRepositoryAdapter(dataSource);
        return new ScopeController({ repository });
    }

    createUserController(dataSource: any) {
        const repository = new UserRepositoryAdapter(dataSource);
        return new UserController({ repository });
    }

    createUserAttributeController(dataSource: any) {
        const repository = new UserAttributeRepositoryAdapter(dataSource);
        return new UserAttributeController({ repository });
    }

    createUserPermissionController(dataSource: any) {
        const repository = new UserPermissionRepositoryAdapter(dataSource);
        return new UserPermissionController({ repository });
    }

    createUserRoleController(dataSource: any) {
        const repository = new UserRoleRepositoryAdapter(dataSource);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new UserRoleController({ repository, identityPermissionService });
    }

    createPolicyController(dataSource: any) {
        const repository = new PolicyRepositoryAdapter(dataSource);
        return new PolicyController({ repository });
    }

    createIdentityProviderRoleController(dataSource: any) {
        const repository = new IdentityProviderRoleMappingRepositoryAdapter(dataSource);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new OAuth2ProviderRoleController({ repository, identityPermissionService });
    }

    createJwkController(dataSource: DataSource) {
        const repository = dataSource.getRepository(KeyEntity);
        return new JwkController({ repository });
    }

    async createRealmController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const dataSource = await useDataSource();
        const repository = new RealmRepositoryAdapter(dataSource);
        const keyRepository = dataSource.getRepository(KeyEntity);

        return new RealmController({
            options: {
                baseURL: config.publicUrl,
            },
            repository,
            keyRepository,
        });
    }
}
