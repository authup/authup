/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extendObject, makeURLPublicAccessible } from '@authup/kit';
import { defineGetter, dycraft } from 'dycraft';
import { parseClientWebConfig } from './parse';
import type { ClientWebConfig, ClientWebConfigInput } from './type';

export function buildClientWebConfig(raw: ClientWebConfigInput): ClientWebConfig {
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
    });

    return extendObject(config, parseClientWebConfig(raw));
}
