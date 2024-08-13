/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import { flattenObject } from '../../../utils';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyData, PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { AttributeNamesPolicy } from './types';
import { AttributeNamesPolicyValidator } from './validator';

export class AttributeNamesPolicyEvaluator implements PolicyEvaluator<AttributeNamesPolicy> {
    protected validator : AttributeNamesPolicyValidator;

    constructor() {
        this.validator = new AttributeNamesPolicyValidator();
    }

    async canEvaluate(ctx: PolicyEvaluatorContext<PolicyWithType>) : Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.ATTRIBUTE_NAMES;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext<PolicyWithType>) : Promise<boolean> {
        if (!isObject(ctx.data.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<AttributeNamesPolicy, PolicyData>): Promise<boolean> {
        if (!ctx.data.attributes) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const attributes = flattenObject(ctx.data.attributes);
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            const index = ctx.policy.names.indexOf(keys[i]);
            if (index === -1) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.policy.invert);
    }
}
