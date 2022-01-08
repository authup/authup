/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { ConnectionWithAdditionalOptions, buildConnectionOptions } from 'typeorm-extension';
import { Config } from '../config';

export function extendDatabaseConnectionOptions(connectionOptions: ConnectionWithAdditionalOptions) {
    connectionOptions = {
        ...connectionOptions,
        entities: [
            ...(connectionOptions.entities ? connectionOptions.entities : []),
            path.join(__dirname, 'entities{.ts,.js}'),
        ],
    };

    connectionOptions = {
        ...connectionOptions,
        migrations: [
            ...(connectionOptions.migrations ? connectionOptions.migrations : []),
            path.join(__dirname, 'migrations', '*{.ts,.js}'),
        ],
    };

    return connectionOptions;
}

export function createDatabaseDefaultConnectionOptions(config: Config) {
    return {
        name: 'default',
        type: 'sqlite',
        database: path.join(config.rootPath, config.writableDirectory, config.env === 'test' ? 'test.sql' : 'db.sql'),
        subscribers: [],
        migrations: [],
    };
}

export async function buildDatabaseConnectionOptions(config: Config) : Promise<ConnectionWithAdditionalOptions> {
    let connectionOptions;

    try {
        connectionOptions = await buildConnectionOptions({
            root: config.rootPath,
        });
    } catch (e) {
        connectionOptions = createDatabaseDefaultConnectionOptions(config);
    }

    connectionOptions = extendDatabaseConnectionOptions(connectionOptions);

    return connectionOptions;
}
