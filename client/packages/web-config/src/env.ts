/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getEnv, getEnvInt } from '@authup/core';
import type { ConfigInput } from './type';

export function readConfigFromEnv() : ConfigInput {
    const config : ConfigInput = {};

    const port = getEnvInt([
        'UI_PORT',
        'NITRO_UI_PORT',
        'NUXT_UI_PORT',
        'NUXT_PUBLIC_UI_PORT',
        'PORT',
        'NITRO_PORT',
        'NUXT_PORT',
        'NUXT_PUBLIC_PORT',
    ]);

    if (typeof port !== 'undefined') {
        config.port = port;
    }

    const host = getEnv([
        'HOST',
        'NITRO_HOST',
        'NUXT_HOST',
    ]);

    if (host) {
        config.host = host;
    }

    const apiUrl = getEnv([
        'API_URL',
        'NUXT_API_URL',
        'NUXT_PUBLIC_API_URL',
    ]);

    if (apiUrl) {
        config.apiUrl = apiUrl;
    }

    const publicURL = getEnv([
        'PUBLIC_URL',
        'NUXT_PUBLIC_URL',
        'NUXT_PUBLIC_PUBLIC_URL',
    ]);

    if (publicURL) {
        config.publicUrl = publicURL;
    }

    return config;
}
