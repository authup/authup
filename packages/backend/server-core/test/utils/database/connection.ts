/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    createDatabase, dropDatabase, setDataSource, unsetDataSource,
} from 'typeorm-extension';
import {
    DataSource, DataSourceOptions,
} from 'typeorm';
import {
    DatabaseRootSeederResult,
    DatabaseSeeder,
    buildDataSourceOptions,
    buildDatabaseOptionsFromConfig,
    useConfig,
    useDataSource,
} from '../../../src';

async function buildOptions() {
    const options = await buildDataSourceOptions();

    return {
        ...options,
        ...(
            options.type !== 'sqlite' &&
            options.type !== 'better-sqlite3' ? { database: 'test' } : {}
        ),
    } as DataSourceOptions;
}

export async function useTestDatabase() : Promise<DatabaseRootSeederResult> {
    const config = await useConfig();

    const options = await buildOptions();
    await createDatabase({ options });

    const dataSource = new DataSource(options);
    await dataSource.initialize();
    await dataSource.synchronize();

    setDataSource(dataSource);

    const databaseOptions = await buildDatabaseOptionsFromConfig(config);
    const core = new DatabaseSeeder(databaseOptions.seed);

    return core.run(dataSource);
}

export async function dropTestDatabase() {
    const dataSource = await useDataSource();
    await dataSource.destroy();

    const { options } = dataSource;

    unsetDataSource();

    await dropDatabase({ options });
}
