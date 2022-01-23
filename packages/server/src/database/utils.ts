/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { ConnectionWithAdditionalOptions, buildConnectionOptions } from 'typeorm-extension';
import { Config } from '../config';
import {
    OAuth2ProviderAccountEntity,
    OAuth2ProviderEntity,
    OAuth2ProviderRoleEntity,
    PermissionEntity,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRoleEntity,
    RoleEntity,
    RolePermissionEntity,
    UserEntity,
    UserPermissionEntity,
    UserRoleEntity,
} from '../domains';
import { OAuth2AccessTokenEntity } from '../domains/oauth2-access-token';
import { OAuth2ClientEntity } from '../domains/oauth2-client';
import { OAuth2RefreshTokenEntity } from '../domains/oauth2-refresh-token';

export function modifyDatabaseConnectionOptions(
    connectionOptions: ConnectionWithAdditionalOptions,
    merge?: boolean,
) {
    connectionOptions = {
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
            RolePermissionEntity,
            UserEntity,
            UserPermissionEntity,
            UserRoleEntity,
            ...(merge && connectionOptions.entities ? connectionOptions.entities : []),
        ],
    };

    connectionOptions = {
        ...connectionOptions,
        subscribers: [
            ...(merge && connectionOptions.subscribers ? connectionOptions.subscribers : []),
        ],
    };

    return connectionOptions;
}

export async function buildDatabaseConnectionOptions(
    config: Config,
    merge?: boolean,
) : Promise<ConnectionWithAdditionalOptions> {
    let connectionOptions;

    try {
        connectionOptions = await buildConnectionOptions({
            root: config.rootPath,
            buildForCommand: true,
        });

        connectionOptions.migrations = [
            path.join(config.rootPath, config.writableDirectory, 'migrations', '*{.ts,.js}'),
        ];

        connectionOptions.logging = ['error'];
    } catch (e) {
        connectionOptions = {
            name: 'default',
            type: 'sqlite',
            database: path.join(config.rootPath, config.writableDirectory, config.env === 'test' ? 'test.sql' : 'db.sql'),
            subscribers: [],
            migrations: [],
        };
    }

    connectionOptions = modifyDatabaseConnectionOptions(connectionOptions, merge);

    return connectionOptions;
}
