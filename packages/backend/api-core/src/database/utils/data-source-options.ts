/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { buildDataSourceOptions as build } from 'typeorm-extension';
import path from 'path';
import { DataSourceOptions } from 'typeorm';
import { Config } from '../../config';
import { setEntitiesForConnectionOptions } from './entities';
import { setSubscribersForConnectionOptions } from './subscribers';

export async function buildDataSourceOptions(
    config: Pick<Config, 'rootPath' | 'writableDirectory' | 'env'>,
    merge?: boolean,
) : Promise<DataSourceOptions> {
    let dataSourceOptions : DataSourceOptions;

    try {
        dataSourceOptions = await build({
            directory: config.rootPath,
        });

        Object.assign(dataSourceOptions, {
            migrations: [
                path.join(config.rootPath, config.writableDirectory, 'migrations', '*{.ts,.js}'),
            ],
            logging: ['error'],
        } as Partial<DataSourceOptions>);
    } catch (e) {
        dataSourceOptions = {
            name: 'default',
            type: 'better-sqlite3',
            database: path.join(
                config.rootPath,
                config.writableDirectory,
                config.env === 'test' ? 'test.sql' : 'db.sql',
            ),
            subscribers: [],
            migrations: [],
            logging: ['error'],
        };
    }

    return extendDataSourceOptions(dataSourceOptions, merge);
}

export function extendDataSourceOptions(options: DataSourceOptions, merge?: boolean) {
    options = setEntitiesForConnectionOptions(options, merge);
    options = setSubscribersForConnectionOptions(options, merge);

    return options;
}
