/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import {
    useDataSourceOptions,
} from './data-source-options';

let instance : DataSource | undefined;

export function setDataSource(data: DataSource) {
    instance = data;
}

export async function useDataSource() {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    const options = await useDataSourceOptions();

    instance = new DataSource(options);
    await instance.initialize();

    return instance;
}
