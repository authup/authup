/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';
import { setDataSourceOptions } from 'typeorm-extension';

export function applyConfigDatabase(options: DataSourceOptions) {
    setDataSourceOptions(options);
}
