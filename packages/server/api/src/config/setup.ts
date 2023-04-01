/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readConfigFile } from '@authup/server-common';
import { merge } from 'smob';
import { setupRedis, setupSmtp, setupVault } from './clients';
import { useConfig } from './module';
import type { OptionsInput } from './type';
import { readConfigFromEnv } from './utils';

export async function setupConfig(
    input?: OptionsInput,
) {
    const fileConfig = await readConfigFile({
        name: 'api',
    });
    const envConfig = await readConfigFromEnv();

    const config = useConfig();
    const rawInput = merge({}, input || {}, envConfig, fileConfig);
    config.setRaw(rawInput);

    if (config.has('redis')) {
        setupRedis(config.get('redis'));
    }

    if (config.has('smtp')) {
        setupSmtp(config.get('smtp'));
    }

    if (config.has('vault')) {
        setupVault(config.get('vault'));
    }

    return config;
}
