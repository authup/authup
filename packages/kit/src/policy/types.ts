/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyType } from './constants';

export interface PolicyBase {
    /**
     * The policy type.
     */
    type: `${PolicyType}`,

    /**
     * Invert evaluation result of policy (true->false and false->true)
     */
    invert: boolean
}
