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
    Config,
    DatabaseRootSeeder,
    DatabaseRootSeederRunResponse,
    buildDataSourceOptions,
    useConfig, useDataSource,
} from '../../../src';

async function buildOptions(config: Config) {
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
    const config = await useConfig();

    const options = await buildOptions(config);
    await createDatabase({ options });

    const dataSource = new DataSource(options);
    await dataSource.initialize();
    await dataSource.synchronize();

    setDataSource(dataSource);

    const core = new DatabaseRootSeeder({
        userName: config.admin.username,
        userPassword: config.admin.password,
    });

    return core.run(dataSource);
}

export async function dropTestDatabase() {
    const dataSource = await useDataSource();
    await dataSource.destroy();

    const { options } = dataSource;

    unsetDataSource();

    await dropDatabase({ options });
}
