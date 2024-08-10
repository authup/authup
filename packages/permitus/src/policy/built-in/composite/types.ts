/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../../constants';
import type { AnyPolicy, PolicyBase } from '../../types';
import type { BuiltInPolicyType } from '../constants';

export interface CompositePolicy extends PolicyBase {
    type: `${BuiltInPolicyType.COMPOSITE}`,

    /**
     * How to decide if a policy evaluates to true.
     */
    decisionStrategy?: `${DecisionStrategy}`,
    /**
     * Child policies.
     */
    children: AnyPolicy[],
}

export type CompositePolicyOptions = Omit<CompositePolicy, 'type'>;
