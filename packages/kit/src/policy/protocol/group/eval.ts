/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyDecisionStrategy } from '../../constants';
import type { PolicyBase } from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { evalPolicyAttributeNames, isPolicyAttributeNames } from '../attribute-names';
import { evalPolicyAttributes, isPolicyAttributes } from '../attributes';
import { evalPolicyTime, isPolicyTime } from '../time';
import type { PolicyGroupEvalContext } from './types';
import { isPolicyGroup } from './utils';

export function evalPolicy(policy: PolicyBase, target?: Record<string, any>) : boolean {
    if (isPolicyAttributeNames(policy)) {
        return evalPolicyAttributeNames(policy, target);
    }

    if (isPolicyAttributes(policy)) {
        return evalPolicyAttributes(policy, target);
    }

    if (isPolicyGroup(policy)) {
        return evalPolicyGroup(policy, target);
    }

    if (isPolicyTime(policy)) {
        return evalPolicyTime(policy);
    }

    return invertPolicyOutcome(false, policy.invert);
}

export function evalPolicyGroup(
    policy: PolicyGroupEvalContext,
    target?: Record<string, any>,
): boolean {
    let count = 0;

    for (let i = 0; i < policy.children.length; i++) {
        const outcome = evalPolicy(policy.children[i], target);
        if (outcome) {
            if (policy.decisionStrategy === PolicyDecisionStrategy.AFFIRMATIVE) {
                return invertPolicyOutcome(true, policy.invert);
            }

            count++;
        } else {
            if (policy.decisionStrategy === PolicyDecisionStrategy.UNANIMOUS) {
                return invertPolicyOutcome(false, policy.invert);
            }

            count--;
        }
    }

    return invertPolicyOutcome(count >= 0, policy.invert);
}
