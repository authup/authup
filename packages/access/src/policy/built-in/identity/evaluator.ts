/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import type { PolicyInput, PolicyWithType } from '../../types';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants';
import type { IdentityPolicy } from './types';
import { IdentityPolicyValidator } from './validator';

export class IdentityPolicyEvaluator implements PolicyEvaluator<IdentityPolicy> {
    protected validator : IdentityPolicyValidator;

    constructor() {
        this.validator = new IdentityPolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.config.type === BuiltInPolicyType.IDENTITY;
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<IdentityPolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<IdentityPolicy>) : Promise<PolicyInput> {
        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    IdentityPolicy
    >): Promise<boolean> {
        if (!isObject(ctx.input.identity)) {
            return maybeInvertPolicyOutcome(false, ctx.config.invert);
        }

        const types = ctx.config.types || [];
        if (types.length === 0) {
            return maybeInvertPolicyOutcome(true, ctx.config.invert);
        }

        const typeAllowed = types.indexOf(ctx.input.identity.type) !== -1;

        return maybeInvertPolicyOutcome(typeAllowed, ctx.config.invert);
    }
}
