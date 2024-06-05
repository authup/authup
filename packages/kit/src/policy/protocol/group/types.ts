/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyDecisionStrategy, PolicyType } from '../../constants';
import type { PolicyBase } from '../../types';

export interface GroupPolicy extends PolicyBase {
    type: `${PolicyType.GROUP}`,

    /**
     * How to decide if a policy evaluates to true.
     */
    decisionStrategy: `${PolicyDecisionStrategy}`,
    /**
     * Child policies.
     */
    children: PolicyBase[],
}

export type PolicyGroupEvalContext = Omit<GroupPolicy, 'type'>;
