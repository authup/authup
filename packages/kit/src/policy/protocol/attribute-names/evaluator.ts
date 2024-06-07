/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase, PolicyEvaluationContext, PolicyEvaluator } from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { isAttributeNamesPolicy } from './helper';
import type { AttributeNamesPolicyEvalContext } from './types';

export class AttributeNamesPolicyEvaluator implements PolicyEvaluator<AttributeNamesPolicyEvalContext> {
    try(policy: PolicyBase, context: PolicyEvaluationContext): boolean {
        if (!isAttributeNamesPolicy(policy)) {
            throw new Error('');
        }

        return this.execute(policy, context);
    }

    execute(policy: AttributeNamesPolicyEvalContext, context: PolicyEvaluationContext): boolean {
        if (typeof context === 'undefined') {
            return invertPolicyOutcome(true, policy.invert);
        }

        const keys = Object.keys(context);
        for (let i = 0; i < keys.length; i++) {
            const index = policy.names.indexOf(keys[i]);
            if (index === -1) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        return invertPolicyOutcome(true, policy.invert);
    }
}
