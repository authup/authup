/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Options,
    createRequestJsonHandler,
    createRequestUrlEncodedHandler,
} from '@routup/body';
import { Router } from 'routup';

export function registerBodyMiddleware(router: Router, input?: Options) {
    const options = input || {};

    router.use(createRequestJsonHandler(options));
    router.use(createRequestUrlEncodedHandler({ extended: false, ...options }));
}
