/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { guard } from '@ucast/mongo2js';
import type { AnyPolicy, PolicyEvaluationContext, PolicyEvaluator } from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { isAttributesPolicy } from './helper';
import type { AttributesPolicyOptions } from './types';

export class AttributesPolicyEvaluator implements PolicyEvaluator<AttributesPolicyOptions> {
    try(policy: AnyPolicy, context: PolicyEvaluationContext): boolean {
        if (!isAttributesPolicy(policy)) {
            return false;
        }

        return this.execute(policy, context);
    }

    execute(policy: AttributesPolicyOptions, context: PolicyEvaluationContext): boolean {
        if (typeof context.target === 'undefined') {
            return invertPolicyOutcome(true, policy.invert);
        }

        const testIt = guard(policy.conditions);
        return invertPolicyOutcome(testIt(context.target), policy.invert);
    }
}
