/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    BasePolicy,
    CompositePolicy,
    IPolicyEvaluator,
    PermissionPolicyBinding,
    PolicyEvaluationContext,
    PolicyEvaluationResult,
} from '@authup/access';
import {
    AttributesPolicyEvaluator,
    BuiltInPolicyType,
    IdentityPolicyEvaluator,
    PermissionBindingPolicyValidator,
    PolicyEngine,
    PolicyIssueCode,
    definePolicyIssueItem,
    maybeInvertPolicyOutcome,
    mergePermissionPolicyBindings,
} from '@authup/access';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';

export class PermissionBindingPolicyEvaluator implements IPolicyEvaluator {
    protected validator : PermissionBindingPolicyValidator;

    protected identityEvaluator: IdentityPolicyEvaluator;

    protected attributesEvaluator : AttributesPolicyEvaluator;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(identityPermissionProvider: IIdentityPermissionProvider) {
        this.validator = new PermissionBindingPolicyValidator();
        this.identityEvaluator = new IdentityPolicyEvaluator();
        this.attributesEvaluator = new AttributesPolicyEvaluator();
        this.identityPermissionProvider = identityPermissionProvider;
    }

    async accessData(ctx: PolicyEvaluationContext) : Promise<PermissionPolicyBinding | null> {
        if (!ctx.data.has(BuiltInPolicyType.PERMISSION_BINDING)) {
            return null;
        }

        if (ctx.data.isValidated(BuiltInPolicyType.PERMISSION_BINDING)) {
            return ctx.data.get(BuiltInPolicyType.PERMISSION_BINDING);
        }

        const data = ctx.data.get<PermissionPolicyBinding>(BuiltInPolicyType.PERMISSION_BINDING);

        ctx.data.set(BuiltInPolicyType.PERMISSION_BINDING, data);
        ctx.data.setValidated(BuiltInPolicyType.PERMISSION_BINDING);

        return data;
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        const policy = await this.validator.run(value);

        const identity = await this.identityEvaluator.accessData(ctx);
        if (!identity) {
            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property identity is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }
        const binding = await this.accessData(ctx);
        if (!binding) {
            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property permission is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        const identityBindings = await this.identityPermissionProvider.getFor(identity)
            .then((bindings) => bindings.filter((item) => {
                if (item.permission.name !== binding.permission.name) {
                    return false;
                }

                return (binding.permission.realm_id ?? null) === (item.permission.realm_id ?? null) &&
                    (binding.permission.client_id ?? null) === (item.permission.client_id ?? null);
            }));

        if (identityBindings.length === 0) {
            return { success: maybeInvertPolicyOutcome(false, policy.invert) };
        }

        const bindingsMerged = mergePermissionPolicyBindings(identityBindings);
        if (bindingsMerged.length === 0) {
            return { success: maybeInvertPolicyOutcome(false, policy.invert) };
        }

        const policies : BasePolicy[] = bindingsMerged
            .flatMap((b) => b.policies || []);

        if (policies.length === 0) {
            return { success: maybeInvertPolicyOutcome(true, policy.invert) };
        }

        if (!ctx.evaluators) {
            return { success: maybeInvertPolicyOutcome(false, policy.invert) };
        }

        const compositePolicy : CompositePolicy = {
            children: policies,
            type: BuiltInPolicyType.COMPOSITE,
        };

        const engine = new PolicyEngine(ctx.evaluators);
        const outcome = await engine.evaluate(compositePolicy, {
            ...ctx,
            path: [
                ...(ctx.path || []),
                ...(compositePolicy.type ? [compositePolicy.type] : []),
            ],
        });

        return {
            ...outcome,
            success: maybeInvertPolicyOutcome(outcome.success, policy.invert),
        };
    }
}
