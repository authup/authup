/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createDatabase, dropDatabase } from 'typeorm-extension';
import {
    DataSource, DataSourceOptions,
} from 'typeorm';
import {
    Config,
    DatabaseRootSeeder,
    DatabaseRootSeederRunResponse,
    buildDataSourceOptions,
    setDataSource, unsetDataSource, useConfig, useDataSource,
} from '../../../src';

async function createConnectionOptions(config: Config) {
    const options = await buildDataSourceOptions(config);

    return {
        ...options,
        ...(
            options.type !== 'sqlite' &&
            options.type !== 'better-sqlite3' ? { database: 'test' } : {}
        ),
    } as DataSourceOptions;
}

export async function useTestDatabase() : Promise<DatabaseRootSeederRunResponse> {
    const config = useConfig();

    const options = await createConnectionOptions(config);
    await createDatabase({ options });

    const dataSource = new DataSource(options);
    await setDataSource(dataSource, true);

    const core = new DatabaseRootSeeder({
        userName: config.adminUsername,
        userPassword: config.adminPassword,
    });

    return core.run(dataSource);
}

export async function dropTestDatabase() {
    const dataSource = await useDataSource();

    const { options } = dataSource;

    await unsetDataSource();

    await dropDatabase({ options });
}
