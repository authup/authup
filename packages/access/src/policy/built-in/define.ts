/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '../types';
import type { BuiltInPolicyTypeMap } from './types';

export function definePolicyWithType<
    K extends keyof BuiltInPolicyTypeMap,
    D extends BuiltInPolicyTypeMap<any>[K],
>(
    type: K,
    data: D,
) : PolicyWithType<D, K> {
    return {
        ...data,
        type,
    };
}
