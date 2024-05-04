/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extendObject, makeURLPublicAccessible } from '@authup/kit';
import { defineGetter, dycraft } from 'dycraft';
import { merge } from 'smob';
import { readConfigFromEnv } from './env';
import { parseConfig } from './parse';
import type { Config, ConfigBuildContext, ConfigInput } from './type';

export function buildConfig(context: ConfigBuildContext = {}) : Config {
    const config = dycraft({
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
    }) as Config;

    let raw : ConfigInput;
    if (context.env) {
        raw = merge(readConfigFromEnv(), context.data || {});
    } else {
        raw = context.data || {};
    }

    return extendObject(config, parseConfig(raw));
}
