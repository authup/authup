/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '../redis';
import type { CacheKeyBuildOptions } from './types';

export function buildCacheKey(options: CacheKeyBuildOptions) {
    return buildRedisKeyPath(options);
}
