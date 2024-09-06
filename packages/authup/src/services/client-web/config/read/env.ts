/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { oneOf, read, readInt } from 'envix';
import type { ClientWebConfigInput } from '../type';

export function readClientWebConfigFromEnv() : ClientWebConfigInput {
    const config : ClientWebConfigInput = {};

    const port = oneOf([
        readInt('UI_PORT'),
        readInt('NITRO_UI_PORT'),
        readInt('NUXT_UI_PORT'),
        readInt('NUXT_PUBLIC_UI_PORT'),
        readInt('PORT'),
        readInt('NITRO_PORT'),
        readInt('NUXT_PORT'),
        readInt('NUXT_PUBLIC_PORT'),
    ]);

    if (typeof port !== 'undefined') {
        config.port = port;
    }

    const host = oneOf([
        read('HOST'),
        read('NITRO_HOST'),
        read('NUXT_HOST'),
    ]);

    if (host) {
        config.host = host;
    }

    const apiUrl = oneOf([
        read('API_URL'),
        read('NUXT_API_URL'),
        read('NUXT_PUBLIC_API_URL'),
    ]);

    if (apiUrl) {
        config.apiUrl = apiUrl;
    }

    const publicURL = oneOf([
        read('PUBLIC_URL'),
        read('NUXT_PUBLIC_URL'),
        read('NUXT_PUBLIC_PUBLIC_URL'),
    ]);

    if (publicURL) {
        config.publicUrl = publicURL;
    }

    return config;
}
