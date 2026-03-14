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
import type {
    Client,
    ClientPermission,
    ClientRole,
    ClientScope,
    Permission,
    Realm,
    Robot,
    RobotPermission,
    RobotRole,
    Role,
    RoleAttribute,
    RolePermission,
    Scope,
    User,
    UserAttribute,
    UserPermission,
    UserRole,
} from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { SystemPolicyName } from '@authup/access';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    ClientScopeEntity,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    KeyEntity,
    PermissionEntity,
    PolicyRepository,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRoleEntity,
    RoleAttributeEntity,
    RoleEntity,
    RolePermissionEntity,
    ScopeEntity,
    UserAttributeEntity,
    UserEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../adapters/database/domains/index.ts';
import {
    ClientPermissionRepositoryAdapter,
    ClientRepositoryAdapter,
    ClientRoleRepositoryAdapter,
    ClientScopeRepositoryAdapter,
    DatabaseInjectionKey,
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
        const realmController = this.createRealmController(container);
        const roleController = this.createRoleController(container);
        const permissionController = await this.createPermissionController(container);
        const clientController = this.createClientController(container);
        const robotController = this.createRobotController(container);
        const clientPermissionController = this.createClientPermissionController(container);
        const clientRoleController = this.createClientRoleController(container);
        const clientScopeController = this.createClientScopeController(container);
        const robotPermissionController = this.createRobotPermissionController(container);
        const robotRoleController = this.createRobotRoleController(container);
        const roleAttributeController = this.createRoleAttributeController(container);
        const rolePermissionController = this.createRolePermissionController(container);
        const scopeController = this.createScopeController(container);
        const userController = this.createUserController(container);
        const userAttributeController = this.createUserAttributeController(container);
        const userPermissionController = this.createUserPermissionController(container);
        const userRoleController = this.createUserRoleController(container);
        const policyController = this.createPolicyController(container);
        const identityProviderRoleController = this.createIdentityProviderRoleController(container);

        router.use(decorators({
            controllers: [
                this.createAuthorize(container),
                this.createToken(container),
                this.createJwkController(container),
                this.createOpenIDController(container),
                this.createActivateController(container),
                this.createPasswordForgotController(container),
                this.createPasswordResetController(container),
                this.createRegisterController(container),

                StatusController,

                clientController,
                clientPermissionController,
                clientRoleController,
                clientScopeController,
                identityProviderRoleController,
                this.createIdentityProvider(container),
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

    createToken(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);

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
        const realmRepository = new RealmRepositoryAdapter(
            container.resolve<Repository<Realm>>(RealmEntity),
        );

        return new PasswordForgotController({
            mailClient,
            repository,
            realmRepository,
            options: {
                registration: config.registration,
                emailVerification: config.emailVerification,
            },
        });
    }

    createPasswordResetController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository,
        });

        return new PasswordResetController({
            repository,
            realmRepository: new RealmRepositoryAdapter(realmRepository),
        });
    }

    createRegisterController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository,
        });
        const mailClient = container.resolve<IMailClient>(MailInjectionKey);

        return new RegisterController({
            mailClient,
            repository,
            realmRepository: new RealmRepositoryAdapter(realmRepository),
            options: {
                registration: config.registration,
                emailVerification: config.emailVerification,
            },
        });
    }

    createIdentityProvider(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);

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

        const repository = new IdentityProviderRepositoryAdapter({
            repository: new IdentityProviderRepository(dataSource),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });

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

    createClientController(container: IDIContainer) {
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new ClientRepositoryAdapter({
            repository: container.resolve<Repository<Client>>(ClientEntity),
            realmRepository,
        });
        return new ClientController({ repository, realmRepository: new RealmRepositoryAdapter(realmRepository) });
    }

    createRobotController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new RobotRepositoryAdapter({
            repository: container.resolve<Repository<Robot>>(RobotEntity),
            realmRepository,
        });
        return new RobotController({ repository, realmRepository: new RealmRepositoryAdapter(realmRepository), dataSource });
    }

    async createPermissionController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new PermissionRepositoryAdapter({
            repository: container.resolve<Repository<Permission>>(PermissionEntity),
            realmRepository,
        });
        const policyRepository = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });

        let defaultPolicyId: string | undefined;
        if (config.permissionsDefaultPolicyAssignment) {
            const defaultPolicy = await policyRepository.findOneByName(SystemPolicyName.DEFAULT);
            if (defaultPolicy) {
                defaultPolicyId = defaultPolicy.id;
            }
        }

        return new PermissionController({
            repository,
            realmRepository: new RealmRepositoryAdapter(realmRepository),
            dataSource,
            defaultPolicyId,
        });
    }

    createRoleController(container: IDIContainer) {
        const repository = new RoleRepositoryAdapter({
            repository: container.resolve<Repository<Role>>(RoleEntity),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });
        return new RoleController({ repository });
    }

    createClientPermissionController(container: IDIContainer) {
        const repository = new ClientPermissionRepositoryAdapter(
            container.resolve<Repository<ClientPermission>>(ClientPermissionEntity),
        );
        return new ClientPermissionController({ repository });
    }

    createClientRoleController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = new ClientRoleRepositoryAdapter(
            container.resolve<Repository<ClientRole>>(ClientRoleEntity),
        );
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new ClientRoleController({ repository, identityPermissionService });
    }

    createClientScopeController(container: IDIContainer) {
        const repository = new ClientScopeRepositoryAdapter(
            container.resolve<Repository<ClientScope>>(ClientScopeEntity),
        );
        return new ClientScopeController({ repository });
    }

    createRobotPermissionController(container: IDIContainer) {
        const repository = new RobotPermissionRepositoryAdapter(
            container.resolve<Repository<RobotPermission>>(RobotPermissionEntity),
        );
        return new RobotPermissionController({ repository });
    }

    createRobotRoleController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = new RobotRoleRepositoryAdapter(
            container.resolve<Repository<RobotRole>>(RobotRoleEntity),
        );
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new RobotRoleController({ repository, identityPermissionService });
    }

    createRoleAttributeController(container: IDIContainer) {
        const repository = new RoleAttributeRepositoryAdapter(
            container.resolve<Repository<RoleAttribute>>(RoleAttributeEntity),
        );
        return new RoleAttributeController({ repository });
    }

    createRolePermissionController(container: IDIContainer) {
        const repository = new RolePermissionRepositoryAdapter(
            container.resolve<Repository<RolePermission>>(RolePermissionEntity),
        );
        return new RolePermissionController({ repository });
    }

    createScopeController(container: IDIContainer) {
        const repository = new ScopeRepositoryAdapter({
            repository: container.resolve<Repository<Scope>>(ScopeEntity),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });
        return new ScopeController({ repository });
    }

    createUserController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });
        return new UserController({ repository });
    }

    createUserAttributeController(container: IDIContainer) {
        const repository = new UserAttributeRepositoryAdapter(
            container.resolve<Repository<UserAttribute>>(UserAttributeEntity),
        );
        return new UserAttributeController({ repository });
    }

    createUserPermissionController(container: IDIContainer) {
        const repository = new UserPermissionRepositoryAdapter(
            container.resolve<Repository<UserPermission>>(UserPermissionEntity),
        );
        return new UserPermissionController({ repository });
    }

    createUserRoleController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = new UserRoleRepositoryAdapter(
            container.resolve<Repository<UserRole>>(UserRoleEntity),
        );
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new UserRoleController({ repository, identityPermissionService });
    }

    createPolicyController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });
        return new PolicyController({ repository, realmRepository: new RealmRepositoryAdapter(realmRepository) });
    }

    createIdentityProviderRoleController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = new IdentityProviderRoleMappingRepositoryAdapter(
            container.resolve<Repository<any>>(IdentityProviderRoleMappingEntity),
        );
        const identityPermissionService = new IdentityPermissionService(dataSource);
        return new OAuth2ProviderRoleController({ repository, identityPermissionService });
    }

    createJwkController(container: IDIContainer) {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = dataSource.getRepository(KeyEntity);
        return new JwkController({ repository });
    }

    createRealmController(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const repository = new RealmRepositoryAdapter(
            container.resolve<Repository<Realm>>(RealmEntity),
        );
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
