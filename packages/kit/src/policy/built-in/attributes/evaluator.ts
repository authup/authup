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

export class AttributesPolicyEvaluator<
    T extends Record<string, any> = Record<string, any>,
> implements PolicyEvaluator<AttributesPolicyOptions<T>> {
    try(policy: AnyPolicy, context: PolicyEvaluationContext): boolean {
        if (!isAttributesPolicy(policy)) {
            return false;
        }

        return this.execute(policy as unknown as AttributesPolicyOptions<T>, context);
    }

    execute(policy: AttributesPolicyOptions<T>, context: PolicyEvaluationContext): boolean {
        if (typeof context.attributes === 'undefined') {
            return invertPolicyOutcome(true, policy.invert);
        }

        const testIt = guard(policy.query);
        return invertPolicyOutcome(testIt(context.attributes), policy.invert);
    }
}
