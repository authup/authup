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

export function modifyDatabaseConnectionOptions(
    connectionOptions: ConnectionWithAdditionalOptions,
    merge?: boolean,
) {
    connectionOptions = {
        ...connectionOptions,
        entities: [
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
        migrations: [
            ...(merge && connectionOptions.migrations ? connectionOptions.migrations : []),
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
