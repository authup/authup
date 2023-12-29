/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getEnv, getEnvInt, hasEnv } from '@authup/core';
import type { Config } from './type';

export function extractConfigFromEnv(config: Config) {
    let keys = [
        'UI_PORT',
        'NITRO_UI_PORT',
        'NUXT_UI_PORT',
        'NUXT_PUBLIC_UI_PORT',
        'PORT',
        'NITRO_PORT',
        'NUXT_PORT',
        'NUXT_PUBLIC_PORT',
    ];
    if (hasEnv(keys)) {
        config.port = getEnvInt(keys, 3000);
    }

    keys = [
        'HOST',
        'NITRO_HOST',
        'NUXT_HOST',
    ];

    if (hasEnv(keys)) {
        config.host = getEnv(keys, '0.0.0.0');
    }

    keys = [
        'API_URL',
        'NUXT_API_URL',
        'NUXT_PUBLIC_API_URL',
    ];

    if (hasEnv(keys)) {
        config.apiUrl = getEnv(keys, 'http://localhost:3010');
    }

    keys = [
        'PUBLIC_URL',
        'NUXT_PUBLIC_URL',
        'NUXT_PUBLIC_PUBLIC_URL',
    ];
    if (hasEnv(keys)) {
        config.publicUrl = getEnv(keys, 'http://localhost:3000');
    }
}
