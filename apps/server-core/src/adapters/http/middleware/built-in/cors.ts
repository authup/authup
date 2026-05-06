/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options as CorsOptions } from '@routup/cors';
import { cors } from '@routup/cors';
import type { Router } from 'routup';

export function registerCorsMiddleware(router: Router, input?: CorsOptions) {
    router.use(cors({
        origin: true,
        credentials: true,
        ...(input ?? {}),
    }));
}
