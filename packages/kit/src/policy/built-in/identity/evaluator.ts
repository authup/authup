/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import type { PolicyData, PolicyWithType } from '../../types';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants';
import type { IdentityPolicy } from './types';
import { IdentityPolicyValidator } from './validator';

export class IdentityPolicyEvaluator implements PolicyEvaluator<IdentityPolicy> {
    protected validator : IdentityPolicyValidator;

    constructor() {
        this.validator = new IdentityPolicyValidator();
    }

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.IDENTITY;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean> {
        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<
    IdentityPolicy,
    PolicyData
    >): Promise<boolean> {
        if (!isObject(ctx.data.identity)) {
            return maybeInvertPolicyOutcome(false, ctx.policy.invert);
        }

        const types = ctx.policy.types || [];
        if (types.length === 0) {
            return maybeInvertPolicyOutcome(true, ctx.policy.invert);
        }

        const typeAllowed = types.indexOf(ctx.data.identity.type) !== -1;

        return maybeInvertPolicyOutcome(typeAllowed, ctx.policy.invert);
    }
}
