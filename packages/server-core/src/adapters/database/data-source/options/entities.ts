/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';

import {
    ClientEntity, ClientPermissionEntity, ClientRoleEntity,
    ClientScopeEntity,
    IdentityProviderAccountEntity,
    IdentityProviderAttributeEntity,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderEntity,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRoleMappingEntity,
    KeyEntity,
    OAuth2RefreshTokenEntity,
    PermissionEntity,
    PolicyAttributeEntity,
    PolicyEntity,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRoleEntity,
    RoleAttributeEntity, RoleEntity,
    RolePermissionEntity,
    ScopeEntity,
    UserAttributeEntity,
    UserEntity,
    UserPermissionEntity,
    UserRoleEntity,
} from '../../domains';

export function extendDataSourceOptionsWithEntities<T extends DataSourceOptions>(options: T) : T {
    return Object.assign(options, {
        entities: [
            KeyEntity,

            OAuth2RefreshTokenEntity,

            ClientEntity,
            ClientPermissionEntity,
            ClientRoleEntity,
            ClientScopeEntity,

            IdentityProviderEntity,
            IdentityProviderAttributeEntity,
            IdentityProviderAccountEntity,
            IdentityProviderRoleMappingEntity,
            IdentityProviderPermissionMappingEntity,
            IdentityProviderAttributeMappingEntity,

            PermissionEntity,

            PolicyEntity,
            PolicyAttributeEntity,

            RealmEntity,

            RobotEntity,
            RobotPermissionEntity,
            RobotRoleEntity,

            RoleEntity,
            RoleAttributeEntity,
            RolePermissionEntity,

            ScopeEntity,

            UserEntity,
            UserAttributeEntity,
            UserPermissionEntity,
            UserRoleEntity,
            ...(options.entities ? options.entities : []) as string[],
        ],
    });
}
