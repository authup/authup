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
    PermissionPolicy,
    Realm,
    Robot,
    RobotPermission,
    RobotRole,
    Role,
    RoleAttribute,
    RolePermission,
    Scope,
    UserAttribute,
    UserPermission,
    UserRole,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRepository,
    ClientRoleEntity,
    ClientScopeEntity,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    KeyEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyRepository,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRepository,
    RobotRoleEntity,
    RoleAttributeEntity,
    RoleEntity,
    RolePermissionEntity,
    RoleRepository,
    ScopeEntity,
    UserAttributeEntity,
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
    PermissionDatabaseProvider,
    PermissionPolicyRepositoryAdapter,
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
    ClientScopeController, 
    IdentityProviderController,
    IdentityProviderRoleMappingController,
    PermissionController,
    PermissionPolicyController,
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
import type { IContainer } from 'eldin';
import {
    ClientAuthenticator,
    ClientPermissionService,
    ClientRoleService,
    ClientScopeService,
    ClientService,
    CredentialsAuthenticator,
    IdentityPermissionProvider,
    IdentityProviderRoleMappingService,
    PasswordRecoveryService,
    PermissionPolicyService,
    PermissionService,
    PolicyService,
    RealmService,
    RegistrationService,
    RobotAuthenticator,
    RobotPermissionService,
    RobotRoleService,
    RobotService,
    RoleAttributeService,
    RolePermissionService,
    RoleService,
    ScopeService,
    UserAttributeService,
    UserAuthenticator,
    UserPermissionService,
    UserRoleService,
    UserService,
} from '../../../../core/index.ts';
import { AuthenticationInjectionKey } from '../../authentication/index.ts';
import { OAuth2InjectionToken } from '../../oauth2/index.ts';
import { IdentityInjectionKey } from '../../identity/index.ts';
import { ConfigInjectionKey } from '../../config/index.ts';
import { MailInjectionKey } from '../../mail/index.ts';

export class HTTPControllerModule {
    async mount(router: Router, container: IContainer): Promise<void> {
        const realmController = this.createRealmController(container);
        const roleController = this.createRoleController(container);
        const permissionController = await this.createPermissionController(container);
        const permissionPolicyController = this.createPermissionPolicyController(container);
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
                permissionPolicyController,
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

    createIdentityPermissionProvider(container: IContainer) {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        return new IdentityPermissionProvider({
            clientRepository: new ClientRepository(dataSource),
            userRepository: new UserRepository(dataSource),
            robotRepository: new RobotRepository(dataSource),
            roleRepository: new RoleRepository(dataSource),
        });
    }

    createAuthorize(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);
        const accessTokenIssuer = container.resolve(OAuth2InjectionToken.AccessTokenIssuer);
        const openIdTokenIssuer = container.resolve(OAuth2InjectionToken.OpenIDTokenIssuer);

        const codeIssuer = container.resolve(OAuth2InjectionToken.AuthorizationCodeIssuer);
        const codeRequestVerifier = container.resolve(OAuth2InjectionToken.AuthorizationCodeRequestVerifier);

        const identityResolver = container.resolve(IdentityInjectionKey.Resolver);

        return new AuthorizeController({
            options: { baseURL: config.publicUrl },

            accessTokenIssuer,
            openIdTokenIssuer,

            codeIssuer,
            codeRequestVerifier,

            identityResolver,
        });
    }

    createToken(container: IContainer) {
        const sessionManager = container.resolve(AuthenticationInjectionKey.SessionManager);

        const codeVerifier = container.resolve(OAuth2InjectionToken.AuthorizationCodeVerifier);

        const accessTokenIssuer = container.resolve(OAuth2InjectionToken.AccessTokenIssuer);
        const refreshTokenIssuer = container.resolve(OAuth2InjectionToken.RefreshTokenIssuer);

        const tokenRevoker = container.resolve(OAuth2InjectionToken.TokenRevoker);
        const tokenVerifier = container.resolve(OAuth2InjectionToken.TokenVerifier);

        const identityResolver = container.resolve(IdentityInjectionKey.Resolver);
        const identityProviderLdapCollectionAuthenticator = container.resolve(IdentityInjectionKey.ProviderLdapCollectionAuthenticator);

        const identityPermissionProvider = this.createIdentityPermissionProvider(container);

        const clientAuthenticator = new ClientAuthenticator(identityResolver);
        const robotAuthenticator = new RobotAuthenticator(identityResolver);

        const userAuthenticator = new CredentialsAuthenticator([
            identityProviderLdapCollectionAuthenticator,
            new UserAuthenticator(identityResolver),
        ]);

        return new TokenController({
            codeVerifier,

            accessTokenIssuer,
            refreshTokenIssuer,

            tokenVerifier,
            tokenRevoker,

            identityResolver,
            identityPermissionProvider,

            clientAuthenticator,
            robotAuthenticator,
            userAuthenticator,

            sessionManager,
        });
    }

    createOpenIDController(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);

        return new OpenIDController({ baseURL: config.publicUrl });
    }

    createActivateController(container: IContainer) {
        return new ActivateController({ service: this.createRegistrationService(container) });
    }

    createPasswordForgotController(container: IContainer) {
        return new PasswordForgotController({ service: this.createPasswordRecoveryService(container) });
    }

    createPasswordResetController(container: IContainer) {
        return new PasswordResetController({ service: this.createPasswordRecoveryService(container) });
    }

    createPasswordRecoveryService(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository,
        });
        const mailClient = container.resolve(MailInjectionKey);

        return new PasswordRecoveryService({
            mailClient,
            repository,
            realmRepository: new RealmRepositoryAdapter(realmRepository),
            options: {
                passwordRecoveryEnabled: config.passwordRecoveryEnabled,
                emailVerificationEnabled: config.emailVerificationEnabled,
            },
        });
    }

    createRegisterController(container: IContainer) {
        return new RegisterController({ service: this.createRegistrationService(container) });
    }

    createRegistrationService(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository,
        });
        const mailClient = container.resolve(MailInjectionKey);

        return new RegistrationService({
            mailClient,
            repository,
            realmRepository: new RealmRepositoryAdapter(realmRepository),
            options: {
                registrationEnabled: config.registrationEnabled,
                emailVerificationEnabled: config.emailVerificationEnabled,
            },
        });
    }

    createIdentityProvider(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);

        const accountManager = container.resolve(IdentityInjectionKey.ProviderAccountManager);

        const codeIssuer = container.resolve(OAuth2InjectionToken.AuthorizationCodeIssuer);

        const codeRequestVerifier = container.resolve(OAuth2InjectionToken.AuthorizationCodeRequestVerifier);

        const stateManager = container.resolve(OAuth2InjectionToken.AuthorizationStateManager);

        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);

        const repository = new IdentityProviderRepositoryAdapter({
            repository: new IdentityProviderRepository(dataSource),
            realmRepository,
        });

        return new IdentityProviderController({
            options: { baseURL: config.publicUrl },

            repository,
            realmRepository: new RealmRepositoryAdapter(realmRepository),

            accountManager,

            codeIssuer,
            codeRequestVerifier,
            stateManager,
        });
    }

    createClientController(container: IContainer) {
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new ClientRepositoryAdapter({
            repository: container.resolve<Repository<Client>>(ClientEntity),
            realmRepository,
        });
        const realmRepositoryAdapter = new RealmRepositoryAdapter(realmRepository);
        const service = new ClientService({
            repository,
            realmRepository: realmRepositoryAdapter, 
        });
        return new ClientController({
            service,
            repository, 
        });
    }

    createRobotController(container: IContainer) {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new RobotRepositoryAdapter({
            repository: container.resolve<Repository<Robot>>(RobotEntity),
            realmRepository,
        });
        const realmRepositoryAdapter = new RealmRepositoryAdapter(realmRepository);
        const service = new RobotService({
            repository,
            realmRepository: realmRepositoryAdapter, 
        });
        return new RobotController({
            service,
            repository,
            realmRepository: realmRepositoryAdapter,
            dataSource,
        });
    }

    async createPermissionController(container: IContainer) {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new PermissionRepositoryAdapter({
            repository: container.resolve<Repository<Permission>>(PermissionEntity),
            realmRepository,
        });

        const realmRepositoryAdapter = new RealmRepositoryAdapter(realmRepository);
        const roleRepository = new RoleRepositoryAdapter({
            repository: container.resolve<Repository<Role>>(RoleEntity),
            realmRepository,
        });
        const rolePermissionRepository = new RolePermissionRepositoryAdapter(
            container.resolve<Repository<RolePermission>>(RolePermissionEntity),
        );
        const policyRepository = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });

        const permissionPolicyRepository = new PermissionPolicyRepositoryAdapter(
            container.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity),
        );

        const service = new PermissionService({
            repository,
            realmRepository: realmRepositoryAdapter,
            roleRepository,
            rolePermissionRepository,
            policyRepository,
            permissionPolicyRepository,
        });

        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        const permissionProvider = new PermissionDatabaseProvider(dataSource);

        return new PermissionController({
            service,
            repository,
            realmRepository: realmRepositoryAdapter,
            identityPermissionProvider,
            permissionProvider,
        });
    }

    createRoleController(container: IContainer) {
        const realmRepository = new RealmRepositoryAdapter(
            container.resolve<Repository<Realm>>(RealmEntity),
        );
        const repository = new RoleRepositoryAdapter({
            repository: container.resolve<Repository<Role>>(RoleEntity),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });
        const service = new RoleService({
            repository,
            realmRepository, 
        });
        return new RoleController({ service });
    }

    createClientPermissionController(container: IContainer) {
        const repository = new ClientPermissionRepositoryAdapter(
            container.resolve<Repository<ClientPermission>>(ClientPermissionEntity),
        );
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        const service = new ClientPermissionService({
            repository,
            identityPermissionProvider, 
        });
        return new ClientPermissionController({ service });
    }

    createClientRoleController(container: IContainer) {
        const repository = new ClientRoleRepositoryAdapter(
            container.resolve<Repository<ClientRole>>(ClientRoleEntity),
        );
        const service = new ClientRoleService({ repository });
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        return new ClientRoleController({
            service,
            repository,
            identityPermissionProvider, 
        });
    }

    createClientScopeController(container: IContainer) {
        const repository = new ClientScopeRepositoryAdapter(
            container.resolve<Repository<ClientScope>>(ClientScopeEntity),
        );
        const service = new ClientScopeService({ repository });
        return new ClientScopeController({ service });
    }

    createRobotPermissionController(container: IContainer) {
        const repository = new RobotPermissionRepositoryAdapter(
            container.resolve<Repository<RobotPermission>>(RobotPermissionEntity),
        );
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        const service = new RobotPermissionService({
            repository,
            identityPermissionProvider, 
        });
        return new RobotPermissionController({ service });
    }

    createRobotRoleController(container: IContainer) {
        const repository = new RobotRoleRepositoryAdapter(
            container.resolve<Repository<RobotRole>>(RobotRoleEntity),
        );
        const service = new RobotRoleService({ repository });
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        return new RobotRoleController({
            service,
            repository,
            identityPermissionProvider, 
        });
    }

    createRoleAttributeController(container: IContainer) {
        const repository = new RoleAttributeRepositoryAdapter(
            container.resolve<Repository<RoleAttribute>>(RoleAttributeEntity),
        );
        const service = new RoleAttributeService({ repository });
        return new RoleAttributeController({ service });
    }

    createRolePermissionController(container: IContainer) {
        const repository = new RolePermissionRepositoryAdapter(
            container.resolve<Repository<RolePermission>>(RolePermissionEntity),
        );
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        const service = new RolePermissionService({
            repository,
            identityPermissionProvider, 
        });
        return new RolePermissionController({ service });
    }

    createPermissionPolicyController(container: IContainer) {
        const repository = new PermissionPolicyRepositoryAdapter(
            container.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity),
        );
        const service = new PermissionPolicyService({ repository });
        return new PermissionPolicyController({ service });
    }

    createScopeController(container: IContainer) {
        const realmRepository = new RealmRepositoryAdapter(
            container.resolve<Repository<Realm>>(RealmEntity),
        );
        const repository = new ScopeRepositoryAdapter({
            repository: container.resolve<Repository<Scope>>(ScopeEntity),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });
        const service = new ScopeService({
            repository,
            realmRepository, 
        });
        return new ScopeController({ service });
    }

    createUserController(container: IContainer) {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository,
        });
        const realmRepositoryAdapter = new RealmRepositoryAdapter(realmRepository);
        const service = new UserService({
            repository,
            realmRepository: realmRepositoryAdapter, 
        });
        return new UserController({ service });
    }

    createUserAttributeController(container: IContainer) {
        const repository = new UserAttributeRepositoryAdapter(
            container.resolve<Repository<UserAttribute>>(UserAttributeEntity),
        );
        const service = new UserAttributeService({ repository });
        return new UserAttributeController({ service });
    }

    createUserPermissionController(container: IContainer) {
        const repository = new UserPermissionRepositoryAdapter(
            container.resolve<Repository<UserPermission>>(UserPermissionEntity),
        );
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        const service = new UserPermissionService({
            repository,
            identityPermissionProvider, 
        });
        return new UserPermissionController({ service });
    }

    createUserRoleController(container: IContainer) {
        const repository = new UserRoleRepositoryAdapter(
            container.resolve<Repository<UserRole>>(UserRoleEntity),
        );
        const service = new UserRoleService({ repository });
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        return new UserRoleController({
            service,
            repository,
            identityPermissionProvider, 
        });
    }

    createPolicyController(container: IContainer) {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);
        const repository = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });
        const realmRepositoryAdapter = new RealmRepositoryAdapter(realmRepository);
        const service = new PolicyService({
            repository,
            realmRepository: realmRepositoryAdapter, 
        });
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        return new PolicyController({
            service,
            repository,
            realmRepository: realmRepositoryAdapter,
            identityPermissionProvider, 
        });
    }

    createIdentityProviderRoleController(container: IContainer) {
        const repository = new IdentityProviderRoleMappingRepositoryAdapter(
            container.resolve<Repository<any>>(IdentityProviderRoleMappingEntity),
        );
        const service = new IdentityProviderRoleMappingService({ repository });
        const identityPermissionProvider = this.createIdentityPermissionProvider(container);
        return new IdentityProviderRoleMappingController({
            service,
            repository,
            identityPermissionProvider,
        });
    }

    createJwkController(container: IContainer) {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const repository = dataSource.getRepository(KeyEntity);
        return new JwkController({ repository });
    }

    createRealmController(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const repository = new RealmRepositoryAdapter(
            container.resolve<Repository<Realm>>(RealmEntity),
        );
        const service = new RealmService({ repository });
        const keyRepository = dataSource.getRepository(KeyEntity);

        return new RealmController({
            options: { baseURL: config.publicUrl },
            service,
            keyRepository,
        });
    }
}
