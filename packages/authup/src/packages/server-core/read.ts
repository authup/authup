/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigRawReadOptions } from '@authup/server-core';
import { readConfigRaw } from '@authup/server-core';

export async function readServerCoreConfig(options: ConfigRawReadOptions) {
    return readConfigRaw(options);
}
