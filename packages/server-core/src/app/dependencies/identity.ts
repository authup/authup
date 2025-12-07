/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import {
    ClientIdentityRepository,
    IdentityProviderAccountRepository,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingRepository,
    IdentityProviderRoleMappingRepository,
    RobotIdentityRepository,
    UserIdentityRepository,
} from '../../adapters/database';
import {
    IDENTITY_PROVIDER_ACCOUNT_MANAGER_TOKEN,
    IDENTITY_RESOLVER_TOKEN,
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
    IdentityResolver,
} from '../../core';

export function registerIdentityDependencies() {
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

    // for ldap authenticator
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
}
