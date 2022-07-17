/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSourceOptions } from 'typeorm';
import {
    OAuth2AccessTokenEntity,
    OAuth2AuthorizationCodeEntity,
    OAuth2ClientEntity,
    OAuth2ProviderAccountEntity,
    OAuth2ProviderEntity,
    OAuth2ProviderRoleEntity,
    OAuth2RefreshTokenEntity,
    PermissionEntity,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRoleEntity, RoleAttributeEntity,
    RoleEntity,
    RolePermissionEntity, UserAttributeEntity,
    UserEntity, UserPermissionEntity, UserRoleEntity,
} from '../../domains';

export function setEntitiesForDataSourceOptions<T extends DataSourceOptions>(options: T) : T {
    return {
        ...options,
        entities: [
            OAuth2AuthorizationCodeEntity,
            OAuth2AccessTokenEntity,
            OAuth2ClientEntity,
            OAuth2RefreshTokenEntity,

            OAuth2ProviderEntity,
            OAuth2ProviderAccountEntity,
            OAuth2ProviderRoleEntity,
            PermissionEntity,
            RealmEntity,
            RobotEntity,
            RobotPermissionEntity,
            RobotRoleEntity,
            RoleEntity,
            RoleAttributeEntity,
            RolePermissionEntity,
            UserEntity,
            UserAttributeEntity,
            UserPermissionEntity,
            UserRoleEntity,
            ...(options.entities ? options.entities : []) as string[],
        ],
    };
}
