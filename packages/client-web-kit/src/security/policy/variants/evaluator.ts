/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    PermissionBindingPolicy,
    PolicyData,
    PolicyEvaluator,
    PolicyEvaluatorContext,
    PolicyWithType,
} from '@authup/kit';
import {
    BuiltInPolicyType,
    PermissionBindingPolicyValidator,
    PolicyError,
} from '@authup/kit';
import { isObject } from 'smob';

export class PermissionBindingPolicyEvaluator implements PolicyEvaluator<PermissionBindingPolicy> {
    protected validator: PermissionBindingPolicyValidator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
    }

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ): Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.PERMISSION_BINDING;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext): Promise<boolean> {
        if (!isObject(ctx.data.identity) && !isObject(ctx.data.permission)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async evaluate(ctx: PolicyEvaluatorContext<
    PermissionBindingPolicy,
    PolicyData
    >): Promise<boolean> {
        // todo: this must be changed when the permission-checker not only checks owned permissions.
        return true;
    }
}
