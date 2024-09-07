/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyConfigDatabase,
    applyConfigLogger,
    applyConfigRedis,
    applyConfigSMTP,
    applyConfigVault,
} from './services';
import type { Config } from '../types';

export function applyConfig(config: Config): Config {
    if (config.redis) {
        applyConfigRedis(config.redis);
    }

    if (config.smtp) {
        applyConfigSMTP(config.smtp);
    }

    if (config.vault) {
        applyConfigVault(config.vault);
    }

    if (config.logger) {
        applyConfigLogger({
            env: config.env,
            directory: config.writableDirectoryPath,
        });
    }

    applyConfigDatabase(config.db);

    return config;
}
