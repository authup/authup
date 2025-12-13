/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import {
    ClientIdentityRepository,
    IdentityProviderAccountRepository,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingRepository, IdentityProviderRepositoryAdapter,
    IdentityProviderRoleMappingRepository,
    RobotIdentityRepository,
    UserIdentityRepository,
} from '../../../adapters/database';
import type { IIdentityProviderAccountManager, ILdapClientFactory } from '../../../core';
import {
    IDENTITY_PROVIDER_ACCOUNT_MANAGER_TOKEN,
    IDENTITY_PROVIDER_LDAP_COLLECTION_AUTHENTICATOR_TOKEN,
    IDENTITY_RESOLVER_TOKEN,
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderLdapCollectionAuthenticator,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
    IdentityResolver,
    LDAP_CLIENT_FACTORY_TOKEN,
} from '../../../core';

export function registerIdentityDependencyInjections() {
    const clientRepository = new ClientIdentityRepository();
    const robotRepository = new RobotIdentityRepository();
    const userRepository = new UserIdentityRepository();

    container.register(IDENTITY_RESOLVER_TOKEN, {
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

    container.register(IDENTITY_PROVIDER_ACCOUNT_MANAGER_TOKEN, {
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
    container.register(IDENTITY_PROVIDER_LDAP_COLLECTION_AUTHENTICATOR_TOKEN, {
        useFactory: (c) => new IdentityProviderLdapCollectionAuthenticator({
            repository: identityProviderRepository,
            accountManager: c.resolve<IIdentityProviderAccountManager>(IDENTITY_PROVIDER_ACCOUNT_MANAGER_TOKEN),
            clientFactory: c.resolve<ILdapClientFactory>(LDAP_CLIENT_FACTORY_TOKEN),
        }),
    });
}
