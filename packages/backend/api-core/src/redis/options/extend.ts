/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RedisOptions } from './type';
import { requireBooleanFromEnv, requireFromEnv } from '../../config/utils';

export function extendRedisOptions(options: Partial<RedisOptions>) : RedisOptions {
    if (typeof options.enabled === 'undefined') {
        options.enabled = requireBooleanFromEnv('REDIS_ENABLED', false);
    }

    if (!options.connectionString) {
        const envValue = requireFromEnv('REDIS_CONNECTION_STRING', null) || undefined;
        if (envValue) {
            options.connectionString = envValue;
        }
    }

    if (!options.alias) {
        const envValue = requireFromEnv('REDIS_ALIAS', null) || undefined;
        if (envValue) {
            options.alias = envValue;
        }
    }

    return options as RedisOptions;
}
