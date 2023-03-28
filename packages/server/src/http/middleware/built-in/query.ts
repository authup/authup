/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ParseOptions } from '@routup/query';
import { createRequestHandler } from '@routup/query';
import type { Router } from 'routup';

export function registerQueryMiddleware(router: Router, input?: ParseOptions) {
    router.use(createRequestHandler(input || {}));
}
