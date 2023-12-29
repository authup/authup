/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFor, readFromFilePaths } from '@authup/config';
import { buildConfig } from './build';
import { setupRedis, setupSmtp, setupVault } from './clients';
import { setConfig } from './module';
import type { Config, ConfigSetupContext } from './type';

export async function setupConfig(context: ConfigSetupContext = {}): Promise<Config> {
    // todo: filePaths should be extracted from env

    let raw : Record<string, any>;
    if (context.filePath) {
        const filePaths = Array.isArray(context.filePath) ?
            context.filePath :
            [context.filePath];

        raw = await readFromFilePaths(filePaths);
    } else {
        raw = await readFor('server', 'core');
    }

    const config = buildConfig({
        data: raw,
        env: true,
    });

    // todo: this should be part of a boot fn
    if (config.redis) {
        setupRedis(config.redis);
    }

    if (config.smtp) {
        setupSmtp(config.smtp);
    }

    if (config.vault) {
        setupVault(config.vault);
    }

    setConfig(config);

    return config;
}
