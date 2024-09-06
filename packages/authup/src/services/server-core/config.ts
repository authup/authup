/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config } from '@authup/server-core';
import { buildConfig } from '@authup/server-core';

export async function buildServerCoreConfig(): Promise<Config> {
    return buildConfig({});
}
