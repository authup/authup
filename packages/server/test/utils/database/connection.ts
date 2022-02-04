/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ConnectionWithSeederOptions, createDatabase, dropDatabase } from 'typeorm-extension';
import { ConnectionOptions, createConnection, getConnection } from 'typeorm';
import {
    Config,
    DatabaseRootSeeder,
    DatabaseRootSeederRunResponse,
    buildDatabaseConnectionOptions,
    useConfig,
} from '../../../src';

async function createConnectionOptions(config: Config) {
    const options = await buildDatabaseConnectionOptions(config);

    return {
        ...options,
        ...(
            options.type !== 'sqlite' &&
            options.type !== 'better-sqlite3' ? { database: 'test' } : {}
        ),
    } as ConnectionWithSeederOptions;
}

export async function useTestDatabase() : Promise<DatabaseRootSeederRunResponse> {
    const config = useConfig();

    const connectionOptions = await createConnectionOptions(config);
    await createDatabase({ ifNotExist: true }, connectionOptions);

    const connection = await createConnection(connectionOptions as ConnectionOptions);
    await connection.synchronize();

    const core = new DatabaseRootSeeder({
        userName: config.adminUsername,
        userPassword: config.adminPassword,
    });

    return core.run(connection);
}

export async function dropTestDatabase() {
    const config = useConfig();
    const connectionOptions = await createConnectionOptions(config);

    await getConnection()
        .close();

    await dropDatabase({ ifExist: true }, connectionOptions);
}
