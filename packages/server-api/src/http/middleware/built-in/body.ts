/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@routup/body';
import {
    createJsonHandler,
    createUrlEncodedHandler,
} from '@routup/body';
import type { Router } from 'routup';

export function registerBodyMiddleware(router: Router, input?: Options) {
    const options = input || {};

    router.use(createJsonHandler(options));
    router.use(createUrlEncodedHandler({ extended: false, ...options }));
}
