/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { ConnectionWithAdditionalOptions, buildConnectionOptions } from 'typeorm-extension';
import path from 'path';
import { Config } from '../../config';
import { setEntitiesForConnectionOptions } from './entities';
import { setSubscribersForConnectionOptions } from './subscribers';

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
            type: 'better-sqlite3',
            database: path.join(config.rootPath, config.writableDirectory, config.env === 'test' ? 'test.sql' : 'db.sql'),
            subscribers: [],
            migrations: [],
            logging: ['error'],
        };
    }

    connectionOptions = setEntitiesForConnectionOptions(connectionOptions, merge);
    connectionOptions = setSubscribersForConnectionOptions(connectionOptions, merge);

    return connectionOptions;
}
