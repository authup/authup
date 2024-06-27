/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy, PolicyEvaluationContext, PolicyEvaluator } from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { isAttributeNamesPolicy } from './helper';
import type { AttributeNamesPolicyOptions } from './types';

export class AttributeNamesPolicyEvaluator implements PolicyEvaluator<AttributeNamesPolicyOptions> {
    try(policy: AnyPolicy, context: PolicyEvaluationContext): boolean {
        if (!isAttributeNamesPolicy(policy)) {
            throw new Error('');
        }

        return this.execute(policy, context);
    }

    execute(policy: AttributeNamesPolicyOptions, context: PolicyEvaluationContext): boolean {
        if (typeof context.attributes === 'undefined') {
            return invertPolicyOutcome(true, policy.invert);
        }

        // todo: target maybe depth 2 (e.g. user.name, role.name)

        const keys = Object.keys(context.attributes);
        for (let i = 0; i < keys.length; i++) {
            const index = policy.names.indexOf(keys[i]);
            if (index === -1) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        return invertPolicyOutcome(true, policy.invert);
    }
}
