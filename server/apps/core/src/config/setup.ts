/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFor } from '@authup/config';
import { merge } from 'smob';
import { setupRedis, setupSmtp, setupVault } from './clients';
import { useConfig } from './module';
import { parseConfig } from './parse';
import type { ConfigInput } from './type';
import { readConfigFromEnv } from './utils';

export async function setupConfig(
    input?: ConfigInput,
) {
    const fileConfig = await readFor('server', 'core');
    const envConfig = readConfigFromEnv();

    const config = useConfig();
    const raw = parseConfig(merge(input || {}, envConfig, fileConfig || {}));
    const keys = Object.keys(raw);
    for (let i = 0; i < keys.length; i++) {
        config[keys[i]] = raw[keys[i]];
    }

    if (config.redis) {
        setupRedis(config.redis);
    }

    if (config.smtp) {
        setupSmtp(config.smtp);
    }

    if (config.vault) {
        setupVault(config.vault);
    }

    return config;
}
