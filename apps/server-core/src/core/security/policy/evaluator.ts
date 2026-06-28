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
    BuiltInPolicyType,
    IdentityPolicyEvaluator,
    PermissionBindingPolicyValidator,
    PolicyEngine,
    PolicyIssueCode,
    RealmMatchPolicyEvaluator,
    definePolicyIssueItem,
    maybeInvertPolicyOutcome,
    mergePermissionPolicyBindings,
} from '@authup/access';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';

export class PermissionBindingPolicyEvaluator implements IPolicyEvaluator {
    protected validator : PermissionBindingPolicyValidator;

    protected identityEvaluator: IdentityPolicyEvaluator;

    protected realmMatchEvaluator : RealmMatchPolicyEvaluator;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(identityPermissionProvider: IIdentityPermissionProvider) {
        this.validator = new PermissionBindingPolicyValidator();
        this.identityEvaluator = new IdentityPolicyEvaluator();
        this.realmMatchEvaluator = new RealmMatchPolicyEvaluator();
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

        // Realm reach (coarse, actor-relative) — a separate factor from the policy_id
        // policies below, ANDed with them but evaluated OUTSIDE the policies[] merge so the
        // policy-free fail-open drop can never touch realm reach. mergePermissionPolicyBindings
        // already folded the scope with the correct policy correlation, and identityBindings is
        // filtered to a single (name, realm_id, client_id) key — so bindingsMerged is length 1
        // and bindingsMerged[0].realm_scope is authoritative (do NOT re-fold).
        //
        // The reach check is the realm-match evaluator in SCOPE MODE: it reads the resource
        // realm from ctx.data[REALM_MATCH] (fallback ATTRIBUTES.realm_id) and neutral-passes
        // when absent (preEvaluate / gate checks). Invoked DIRECTLY (not via PolicyEngine —
        // REALM_MATCH is in policiesExcluded, so the engine would skip it).
        const realmOutcome = await this.realmMatchEvaluator.evaluate(
            { scope: bindingsMerged[0].realm_scope },
            ctx,
        );
        if (!realmOutcome.success) {
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
