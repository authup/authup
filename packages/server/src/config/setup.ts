/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { setupRedis, setupSmtp, setupVault } from './clients';
import { useConfig } from './module';
import { readCofnigFromEnv, readConfigFromFile } from './utils';

export async function setupConfig() {
    const fileConfig = await readConfigFromFile();
    const envConfig = await readCofnigFromEnv();

    const input = merge({}, envConfig, fileConfig);

    const config = useConfig();
    config.setRaw(input);

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
