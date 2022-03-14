/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ConnectionOptions } from 'typeorm';
import { OAuth2AccessTokenEntity } from '../../domains/oauth2-access-token';
import { OAuth2ClientEntity } from '../../domains/oauth2-client';
import { OAuth2RefreshTokenEntity } from '../../domains/oauth2-refresh-token';
import {
    OAuth2ProviderAccountEntity,
    OAuth2ProviderEntity,
    OAuth2ProviderRoleEntity,
    PermissionEntity,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRoleEntity, RoleAttributeEntity,
    RoleEntity,
    RolePermissionEntity, UserAttributeEntity,
    UserEntity, UserPermissionEntity, UserRoleEntity,
} from '../../domains';

export function setEntitiesForConnectionOptions<T extends ConnectionOptions>(
    connectionOptions: T,
    merge?: boolean,
) : T {
    return {
        ...connectionOptions,
        entities: [
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
            ...(merge && connectionOptions.entities ? connectionOptions.entities : []),
        ],
    };
}
