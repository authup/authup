/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { TokenVerifierCache } from './type';

export function isTokenVerifierCache(input: unknown) : input is TokenVerifierCache {
    return isObject(input) &&
        typeof (input as TokenVerifierCache).set === 'function' &&
        typeof (input as TokenVerifierCache).get === 'function';
}
