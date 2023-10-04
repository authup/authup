/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CorsOptions } from 'cors';
import cors from 'cors';
import { coreHandler } from 'routup';
import type { Router } from 'routup';
import { merge } from 'smob';

export function registerCorsMiddleware(router: Router, input?: CorsOptions) {
    const options : CorsOptions = merge(input || {}, {
        origin(origin, callback) {
            callback(null, true);
        },
        credentials: true,
    });

    router.use(coreHandler((req, res, next) => cors(options)(req, res, next)));
}
