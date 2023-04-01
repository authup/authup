/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasProcessEnv, readFromProcessEnv, readIntFromProcessEnv } from '@authup/server-common';
import type { UIConfig } from './type';

export function extendUIConfigWithEnv(config: UIConfig) {
    if (hasProcessEnv(['UI_PORT', 'NUXT_UI_PORT', 'PORT', 'NUXT_PORT'])) {
        config.setRaw('port', readIntFromProcessEnv(['UI_PORT', 'NUXT_UI_PORT', 'PORT', 'NUXT_PORT']));
    }

    if (hasProcessEnv(['HOST', 'NUXT_HOST'])) {
        config.setRaw('host', readFromProcessEnv(['HOST', 'NUXT_HOST']));
    }

    if (hasProcessEnv(['API_URL', 'NUXT_API_URL'])) {
        config.setRaw('apiUrl', readFromProcessEnv(['API_URL', 'NUXT_API_URL']));
    }

    if (hasProcessEnv(['PUBLIC_URL', 'NUXT_PUBLIC_URL'])) {
        config.setRaw('publicUrl', readFromProcessEnv(['PUBLIC_URL', 'NUXT_PUBLIC_URL']));
    }
}
