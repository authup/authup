/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HTTPClient } from '../http';

export function useDomainAPI(client: HTTPClient, name: string) {
    switch (name) {
        case 'oauth2Provider':
            return client.identityProvider;
        case 'oauth2ProviderRole':
            return client.identityProviderRole;
        case 'permission':
            return client.permission;
        case 'realm':
            return client.realm;
        case 'robot':
            return client.robot;
        case 'robotPermission':
            return client.robotPermission;
        case 'role':
            return client.role;
        case 'roleAttribute':
            return client.roleAttribute;
        case 'rolePermission':
            return client.rolePermission;
        case 'user':
            return client.user;
        case 'userAttribute':
            return client.userAttribute;
        case 'userPermission':
            return client.userPermission;
        case 'userRole':
            return client.userRole;
    }

    return undefined;
}
