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
    extend?: boolean,
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
            ...(extend && connectionOptions.entities ? connectionOptions.entities : []),
        ],
    };

    connectionOptions = {
        ...connectionOptions,
        migrations: [
            path.join(__dirname, 'migrations', '*{.ts,.js}'),
            ...(extend && connectionOptions.migrations ? connectionOptions.migrations : []),
        ],
    };

    return connectionOptions;
}

export async function buildDatabaseConnectionOptions(
    config: Config,
    extend?: boolean,
) : Promise<ConnectionWithAdditionalOptions> {
    let connectionOptions;

    try {
        connectionOptions = await buildConnectionOptions({
            root: config.rootPath,
            buildForCommand: true,
        });
    } catch (e) {
        connectionOptions = {
            name: 'default',
            type: 'sqlite',
            database: path.join(config.rootPath, config.writableDirectory, config.env === 'test' ? 'test.sql' : 'db.sql'),
            subscribers: [],
            migrations: [],
        };
    }

    connectionOptions = modifyDatabaseConnectionOptions(connectionOptions, extend);

    return connectionOptions;
}
