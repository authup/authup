/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { singa } from 'singa';
import type { DataSource } from 'typeorm';

const instance = singa<DataSource>({
    name: 'dataSource',
});

export function setDataSourceSync(dataSource: DataSource) {
    instance.setFactory(() => dataSource);
}

export function useDataSourceSync() {
    return instance.use();
}
