/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenObject, isObject } from '@authup/kit';
import { PolicyError } from '../../error';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
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

    async can(ctx: PolicyEvaluateContext<PolicyWithType>) : Promise<boolean> {
        return ctx.spec.type === BuiltInPolicyType.ATTRIBUTE_NAMES;
    }

    async validateSpecification(ctx: PolicyEvaluateContext<PolicyWithType>) : Promise<AttributeNamesPolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext<AttributeNamesPolicy>) : Promise<PolicyData> {
        if (!isObject(ctx.data.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<AttributeNamesPolicy, PolicyData>): Promise<boolean> {
        if (!ctx.data.attributes) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const attributes = flattenObject(ctx.data.attributes);
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            const index = ctx.spec.names.indexOf(keys[i]);
            if (index === -1) {
                return maybeInvertPolicyOutcome(false, ctx.spec.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.spec.invert);
    }
}
