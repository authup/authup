/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    PermissionBindingPolicy,
    PolicyData,
    PolicyEvaluateContext,
    PolicyEvaluator,
    PolicyWithType,
} from '@authup/kit';
import {
    BuiltInPolicyType,
    PermissionBindingPolicyValidator,
    PolicyError,
    maybeInvertPolicyOutcome,
} from '@authup/kit';
import { isObject } from 'smob';

export class PermissionBindingPolicyEvaluator implements PolicyEvaluator<PermissionBindingPolicy> {
    protected validator: PermissionBindingPolicyValidator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ): Promise<boolean> {
        return ctx.spec.type === BuiltInPolicyType.PERMISSION_BINDING;
    }

    async validateSpecification(ctx: PolicyEvaluateContext) : Promise<PermissionBindingPolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext) : Promise<PolicyData> {
        if (!isObject(ctx.data.identity) && !isObject(ctx.data.permission)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<
    PermissionBindingPolicy,
    PolicyData
    >): Promise<boolean> {
        // todo: this must be changed when the permission-checker not only checks owned permissions.
        return maybeInvertPolicyOutcome(true, ctx.spec.invert);
    }
}
