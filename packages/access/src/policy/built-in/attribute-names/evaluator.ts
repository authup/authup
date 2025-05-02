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
import type { PolicyInput, PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { AttributeNamesPolicy } from './types';
import { AttributeNamesPolicyValidator } from './validator';

export class AttributeNamesPolicyEvaluator implements PolicyEvaluator<AttributeNamesPolicy> {
    protected validator : AttributeNamesPolicyValidator;

    constructor() {
        this.validator = new AttributeNamesPolicyValidator();
    }

    async can(ctx: PolicyEvaluateContext<PolicyWithType>) : Promise<boolean> {
        return ctx.config.type === BuiltInPolicyType.ATTRIBUTE_NAMES;
    }

    async validateConfig(ctx: PolicyEvaluateContext<PolicyWithType>) : Promise<AttributeNamesPolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<AttributeNamesPolicy>) : Promise<PolicyInput> {
        if (!isObject(ctx.input.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<AttributeNamesPolicy, PolicyInput>): Promise<boolean> {
        if (!ctx.input.attributes) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const attributes = flattenObject(ctx.input.attributes);
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            const index = ctx.config.names.indexOf(keys[i]);
            if (index === -1) {
                return maybeInvertPolicyOutcome(false, ctx.config.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.config.invert);
    }
}
