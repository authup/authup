/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '@authup/config';
import { buildConfig } from './build';
import { setupRedis, setupSmtp, setupVault } from './clients';
import { setConfig } from './module';
import type { Config, ConfigSetupContext } from './types';

export async function setupConfig(context: ConfigSetupContext = {}): Promise<Config> {
    const container = new Container({
        prefix: 'authup',
        keys: ['server/core'],
    });

    if (context.filePath) {
        const filePaths = Array.isArray(context.filePath) ?
            context.filePath :
            [context.filePath];

        await container.loadFromFilePath(filePaths);
    } else {
        await container.load();
    }

    const config = buildConfig({
        data: container.getData('server/core'),
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
