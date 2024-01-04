/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Container } from '@authup/config';
import type { Config } from '@authup/server-core';
import { buildConfig, parseConfig } from '@authup/server-core';

export async function buildServerCoreConfig(container: Container): Promise<Config> {
    const data = parseConfig(container.getData('server/core'));

    return buildConfig({
        data,
        env: true,
    });
}
