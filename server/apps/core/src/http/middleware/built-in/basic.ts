/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@routup/basic';
import {
    basic,
} from '@routup/basic';
import type { Router } from 'routup';

export function registerBasicMiddleware(router: Router, input?: Options) {
    router.use(basic(input));
}
