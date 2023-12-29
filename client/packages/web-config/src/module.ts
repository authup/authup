/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/core';
import { defineGetter, dycraft } from 'dycraft';
import { extractConfigFromEnv } from './env';
import type { Config, ConfigBuildContext } from './type';

export function buildConfig(context: ConfigBuildContext = {}) : Config {
    const config = dycraft({
        data: context.data,
        defaults: {
            port: 3000,
            host: '0.0.0.0',
            apiUrl: 'http://127.0.0.1:3001/',
        },
        getters: {
            publicUrl: defineGetter((
                context,
            ) => `http://${makeURLPublicAccessible(context.get('host'))}:${context.get('port')}/`),
        },
    });

    if (context.env) {
        extractConfigFromEnv(config);
    }

    return config;
}
