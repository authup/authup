/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
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

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.spec.type === BuiltInPolicyType.IDENTITY;
    }

    async validateSpecification(ctx: PolicyEvaluateContext) : Promise<IdentityPolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext<IdentityPolicy>) : Promise<PolicyData> {
        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    IdentityPolicy
    >): Promise<boolean> {
        if (!isObject(ctx.data.identity)) {
            return maybeInvertPolicyOutcome(false, ctx.spec.invert);
        }

        const types = ctx.spec.types || [];
        if (types.length === 0) {
            return maybeInvertPolicyOutcome(true, ctx.spec.invert);
        }

        const typeAllowed = types.indexOf(ctx.data.identity.type) !== -1;

        return maybeInvertPolicyOutcome(typeAllowed, ctx.spec.invert);
    }
}
