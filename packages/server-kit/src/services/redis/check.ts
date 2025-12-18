/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { RedisClient } from './module';

export function isRedisClient(data: unknown) : data is RedisClient {
    return isObject(data) &&
        typeof data.connect === 'function' &&
        typeof data.disconnect === 'function';
}
