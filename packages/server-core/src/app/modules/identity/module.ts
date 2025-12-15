/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import {
    ClientIdentityRepository,
    IdentityProviderAccountRepository,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingRepository,
    IdentityProviderRepositoryAdapter,
    IdentityProviderRoleMappingRepository,
    RobotIdentityRepository,
    UserIdentityRepository,
} from '../../../adapters/database';
import type { DependencyContainer, IIdentityProviderAccountManager, ILdapClientFactory } from '../../../core';
import {
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderLdapCollectionAuthenticator,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
    IdentityResolver,
} from '../../../core';
import { LDAPInjectionKey } from '../ldap';

import type { ApplicationModule } from '../types';
import { IdentityInjectionKey } from './constants';

export class IdentityModule implements ApplicationModule {
    protected container : DependencyContainer;

    // ----------------------------------------------------

    constructor(container: DependencyContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const clientRepository = new ClientIdentityRepository();
        const robotRepository = new RobotIdentityRepository();
        const userRepository = new UserIdentityRepository();

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

        this.container.register(IdentityInjectionKey.ProviderAccountManager, {
            useFactory: () => new IdentityProviderAccountManager({
                repository: providerAccountRepository,
                userRepository,
                attributeMapper,
                roleMapper,
                permissionMapper,
            }),
        });

        // ---------------------------------------------

        const identityProviderRepository = new IdentityProviderRepositoryAdapter();
        this.container.register(IdentityInjectionKey.ProviderLdapCollectionAuthenticator, {
            useFactory: (c) => new IdentityProviderLdapCollectionAuthenticator({
                repository: identityProviderRepository,
                accountManager: c.resolve<IIdentityProviderAccountManager>(IdentityInjectionKey.ProviderAccountManager),
                clientFactory: c.resolve<ILdapClientFactory>(LDAPInjectionKey.ClientFactory),
            }),
        });
    }
}
