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
    const dataSourceOptions = await _buildDataSourceOptions();

    Object.assign(dataSourceOptions, {
        migrations: [
            path.join(__dirname, 'migrations', '*{.ts,.js}'),
        ],
    } as DataSourceOptions);

    return dataSourceOptions;
}
