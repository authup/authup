/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '../../domains';
import type { APIClient } from './module';

export function useHTTPClientAPI(
    client: APIClient,
    name: `${DomainType}`,
) {
    switch (name) {
        case DomainType.CLIENT:
            return client.client;
        case DomainType.IDENTITY_PROVIDER:
            return client.identityProvider;
        case DomainType.IDENTITY_PROVIDER_ROLE:
            return client.identityProviderRole;
        case DomainType.PERMISSION:
            return client.permission;
        case DomainType.REALM:
            return client.realm;
        case DomainType.ROBOT:
            return client.robot;
        case DomainType.ROBOT_PERMISSION:
            return client.robotPermission;
        case DomainType.ROLE:
            return client.role;
        case DomainType.ROLE_ATTRIBUTE:
            return client.roleAttribute;
        case DomainType.ROLE_PERMISSION:
            return client.rolePermission;
        case DomainType.SCOPE:
            return client.scope;
        case DomainType.USER:
            return client.user;
        case DomainType.USER_ATTRIBUTE:
            return client.userAttribute;
        case DomainType.USER_PERMISSION:
            return client.userPermission;
        case DomainType.USER_ROLE:
            return client.userRole;
    }

    return undefined;
}
