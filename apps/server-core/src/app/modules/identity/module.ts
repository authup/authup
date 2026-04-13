/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, UserPermission, UserRole } from '@authup/core-kit';
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
    ClientRepository,
    IdentityProviderRepository,
    RealmEntity,
    RobotRepository,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../adapters/database/domains/index.ts';
import type { IContainer } from 'eldin';
import {
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderLdapCollectionAuthenticator,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
    IdentityResolver,
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

        const attributeMapperFinder = new IdentityProviderAttributeMappingRepository();
        const attributeMapper = new IdentityProviderAttributeMapper(attributeMapperFinder);

        const roleMapperFinder = new IdentityProviderRoleMappingRepository();
        const roleMapper = new IdentityProviderRoleMapper(roleMapperFinder);

        const permissionMapperFinder = new IdentityProviderPermissionMappingRepository();
        const permissionMapper = new IdentityProviderPermissionMapper(permissionMapperFinder);

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
