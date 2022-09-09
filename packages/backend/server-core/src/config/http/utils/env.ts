/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MiddlewareOptionsInput } from '../type';

export function extractMiddlewareOptionsFromEnv(input?: MiddlewareOptionsInput) : MiddlewareOptionsInput {
    return {
        ...(input || {}),
    };
}
