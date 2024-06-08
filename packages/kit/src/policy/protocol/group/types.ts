/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyDecisionStrategy } from '../../constants';
import type { AnyPolicy, PolicyBase } from '../../types';
import type { BuiltInPolicyType } from '../constants';

export interface GroupPolicy extends PolicyBase {
    type: `${BuiltInPolicyType.GROUP}`,

    /**
     * How to decide if a policy evaluates to true.
     */
    decisionStrategy?: `${PolicyDecisionStrategy}`,
    /**
     * Child policies.
     */
    children: AnyPolicy[],
}

export type PolicyGroupOptions = Omit<GroupPolicy, 'type'>;
