/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/prometheus';
import { prometheus } from '@routup/prometheus';
import type { App } from 'routup';

export function registerPrometheusMiddleware(router: App, input?: OptionsInput) {
    let options : OptionsInput = {
        skip(event) {
            let { path } = event;
            if (!path.startsWith('/')) {
                path = `/${path}`;
            }

            return path.startsWith('/metrics') ||
                path === '/';
        },
    };

    if (input) {
        options = {
            ...options,
            ...input,
        };
    }

    router.use(prometheus(options));
}
