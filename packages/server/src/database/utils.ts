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
    if (!connectionOptions.entities) {
        connectionOptions = {
            ...connectionOptions,
            entities: [
                ...(connectionOptions.entities ? connectionOptions.entities : []),
                path.join(__dirname, 'entities{.ts,.js}'),
            ],
        };
    }

    if (!connectionOptions.migrations) {
        connectionOptions = {
            ...connectionOptions,
            migrations: [
                ...(connectionOptions.migrations ? connectionOptions.migrations : []),
                path.join(__dirname, 'migrations', '*{.ts,.js}'),
            ],
        };
    }

    return connectionOptions;
}

export function createDatabaseDefaultConnectionOptions(writableDirectoryPath: string) {
    return {
        type: 'sqlite',
        database: path.join(writableDirectoryPath, 'db.sql'),
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
        connectionOptions = createDatabaseDefaultConnectionOptions(path.join(config.rootPath, config.writableDirectory));
    }

    return connectionOptions;
}
