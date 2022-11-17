/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';

/**
 * Deep merge two objects.
 *
 * Backward compatibility for @authelion/vue@0.3.2
 *
 * @deprecated
 * @param target
 * @param sources
 */
export function mergeDeep<A extends Record<string, any>, B extends Record<string, any>>(
    target: A,
    ...sources: B[]
) : A & B {
    return merge(target, ...sources);
}
