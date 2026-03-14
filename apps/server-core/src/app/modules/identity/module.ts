/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, UserPermission, UserRole } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
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
import type { IDIContainer, IIdentityProviderAccountManager, ILdapClientFactory } from '../../../core/index.ts';
import {
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderLdapCollectionAuthenticator,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
    IdentityResolver,
} from '../../../core/index.ts';
import { LDAPInjectionKey } from '../ldap/index.ts';

import type { Module } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { IdentityInjectionKey } from './constants.ts';

export class IdentityModule implements Module {
    readonly name: string;

    readonly dependsOn: string[];

    constructor() {
        this.name = ModuleName.IDENTITY;
        this.dependsOn = [ModuleName.DATABASE];
    }

    async start(container: IDIContainer): Promise<void> {
        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);

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

        const attributeMapperRepository = new IdentityProviderAttributeMappingRepository();
        const attributeMapper = new IdentityProviderAttributeMapper(attributeMapperRepository);

        const roleMapperRepository = new IdentityProviderRoleMappingRepository();
        const roleMapper = new IdentityProviderRoleMapper(roleMapperRepository);

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
                accountManager: c.resolve<IIdentityProviderAccountManager>(IdentityInjectionKey.ProviderAccountManager),
                clientFactory: c.resolve<ILdapClientFactory>(LDAPInjectionKey.ClientFactory),
            }),
        });
    }
}
