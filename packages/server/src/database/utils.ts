/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { DataSourceOptions } from 'typeorm';
import { buildDataSourceOptions as _buildDataSourceOptions } from '@authup/server-database';

export async function buildDataSourceOptions() : Promise<DataSourceOptions> {
    // todo: parse data-source options by config.
    const dataSourceOptions = await _buildDataSourceOptions();

    if (process.env.NODE_ENV === 'test') {
        Object.assign(dataSourceOptions, {
            migrations: [],
        } as DataSourceOptions);
    } else {
        Object.assign(dataSourceOptions, {
            migrations: [
                path.join(__dirname, 'migrations', dataSourceOptions.type, '*{.ts,.js}'),
            ],
        } as DataSourceOptions);
    }

    return dataSourceOptions;
}
