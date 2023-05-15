/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ParseOptions } from '@routup/cookie';
import {
    createHandler,
} from '@routup/cookie';
import type { Router } from 'routup';

export function registerCookieMiddleware(router: Router, input?: ParseOptions) {
    router.use(createHandler(input || {}));
}
