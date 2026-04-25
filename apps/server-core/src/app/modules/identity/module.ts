/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client,
    Realm,
    Robot,
    Role,
    UserPermission,
    UserRole,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import {
    ClientIdentityRepository,
    IdentityProviderAccountRepository,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingRepository,
    IdentityProviderRoleMappingRepository,
    RobotIdentityRepository,
    UserIdentityRepository,
} from './repositories/index.ts';
import { DatabaseInjectionKey, IdentityProviderRepositoryAdapter } from '../database/index.ts';
import {
    ClientEntity,
    ClientRepository,
    IdentityProviderRepository,
    RealmEntity,
    RobotEntity,
    RobotRepository,
    RoleEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../adapters/database/domains/index.ts';
import {
    ClientRepositoryAdapter,
    RobotRepositoryAdapter,
    RoleRepositoryAdapter,
    UserRepositoryAdapter,
} from '../database/repositories/index.ts';
import type { IContainer } from 'eldin';
import {
    IdentityPermissionProvider,
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderLdapCollectionAuthenticator,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
    IdentityResolver,
    IdentityRoleProvider,
} from '../../../core/index.ts';
import { LDAPInjectionKey } from '../ldap/index.ts';

import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { IdentityInjectionKey } from './constants.ts';

export class IdentityModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    constructor() {
        this.name = ModuleName.IDENTITY;
        this.dependencies = [ModuleName.DATABASE];
    }

    async setup(container: IContainer): Promise<void> {
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);

        const clientRepository = new ClientIdentityRepository(
            new ClientRepository(dataSource),
        );
        const robotRepository = new RobotIdentityRepository(
            new RobotRepository(dataSource),
        );
        const userRepository = new UserIdentityRepository({
            repository: new UserRepository(dataSource),
            userPermissionRepository: container.resolve<Repository<UserPermission>>(UserPermissionEntity),
            userRoleRepository: container.resolve<Repository<UserRole>>(UserRoleEntity),
        });

        container.register(IdentityInjectionKey.Resolver, {
            useFactory: () => new IdentityResolver({
                clientRepository,
                robotRepository,
                userRepository,
            }),
        });

        // ---------------------------------------------

        const clientRepositoryAdapter = new ClientRepositoryAdapter({
            repository: container.resolve<Repository<Client>>(ClientEntity),
            realmRepository,
        });
        const userRepositoryAdapter = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository,
        });
        const robotRepositoryAdapter = new RobotRepositoryAdapter({
            repository: container.resolve<Repository<Robot>>(RobotEntity),
            realmRepository,
        });
        const roleRepositoryAdapter = new RoleRepositoryAdapter({
            repository: container.resolve<Repository<Role>>(RoleEntity),
            realmRepository,
        });

        container.register(IdentityInjectionKey.RoleProvider, {
            useFactory: () => new IdentityRoleProvider({
                clientRepository: clientRepositoryAdapter,
                userRepository: userRepositoryAdapter,
                robotRepository: robotRepositoryAdapter,
            }),
        });

        container.register(IdentityInjectionKey.PermissionProvider, {
            useFactory: (c) => new IdentityPermissionProvider({
                clientRepository: clientRepositoryAdapter,
                userRepository: userRepositoryAdapter,
                robotRepository: robotRepositoryAdapter,
                roleRepository: roleRepositoryAdapter,
                roleProvider: c.resolve(IdentityInjectionKey.RoleProvider),
            }),
        });

        // ---------------------------------------------

        const attributeMapperRepository = new IdentityProviderAttributeMappingRepository();
        const attributeMapper = new IdentityProviderAttributeMapper(attributeMapperRepository);

        const roleMapperFinder = new IdentityProviderRoleMappingRepository();
        const roleMapper = new IdentityProviderRoleMapper(roleMapperFinder);

        const permissionMapperRepository = new IdentityProviderPermissionMappingRepository();
        const permissionMapper = new IdentityProviderPermissionMapper(permissionMapperRepository);

        const providerAccountRepository = new IdentityProviderAccountRepository();

        container.register(IdentityInjectionKey.ProviderAccountManager, {
            useFactory: () => new IdentityProviderAccountManager({
                repository: providerAccountRepository,
                userRepository,
                attributeMapper,
                roleMapper,
                permissionMapper,
            }),
        });

        // ---------------------------------------------

        const identityProviderRepository = new IdentityProviderRepositoryAdapter({
            repository: new IdentityProviderRepository(dataSource),
            realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
        });
        container.register(IdentityInjectionKey.ProviderLdapCollectionAuthenticator, {
            useFactory: (c) => new IdentityProviderLdapCollectionAuthenticator({
                repository: identityProviderRepository,
                accountManager: c.resolve(IdentityInjectionKey.ProviderAccountManager),
                clientFactory: c.resolve(LDAPInjectionKey.ClientFactory),
            }),
        });
    }
}
