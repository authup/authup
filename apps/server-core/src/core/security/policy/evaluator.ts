/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue } from 'validup';
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

        // identityBindings is filtered to a single (name, realm_id, client_id) key, so the
        // merge yields exactly one binding. Its `grants` carry the per-grant
        // (realm_scope, policies) terms; access is the DISJUNCTION over them:
        //   ∃ grant . realmScopeMatches(grant.realm_scope, resource) ∧ (grant.policies pass)
        // Keeping each grant's realm reach paired with its OWN policies fixes both the mixed
        // policy-free + policy-bound UNDER-grant (the collapsed binding folds the scope from
        // the policy-free subset only, dropping a policy-bound grant's wider reach) and the
        // symmetric all-policy-bound OVER-grant (a stray grant's policy must not ride another
        // grant's wider scope). The collapsed realm_scope/policies stay as-is for the other
        // merge consumers; only this evaluator reads `grants`.
        const grants = bindingsMerged[0].grants ?? [{
            realm_scope: bindingsMerged[0].realm_scope,
            policies: bindingsMerged[0].policies,
            decision_strategy: bindingsMerged[0].permission.decision_strategy,
        }];

        const issues : Issue[] = [];
        for (const grant of grants) {
            // Realm reach (coarse, actor-relative) — a SEPARATE factor from the grant's
            // policy_id policies, ANDed with them but evaluated OUTSIDE the policies merge so
            // the policy-free fail-open drop can never touch realm reach. The realm-match
            // evaluator runs in SCOPE MODE: it reads the resource realm from
            // ctx.data[REALM_MATCH] (fallback ATTRIBUTES.realm_id) and neutral-passes when
            // absent (preEvaluate / gate checks / realm-less resources) — key-PRESENCE is the
            // discriminator. Invoked DIRECTLY (not via PolicyEngine — REALM_MATCH is in
            // policiesExcluded, so the engine would skip it).
            const realmOutcome = await this.realmMatchEvaluator.evaluate(
                { scope: grant.realm_scope },
                ctx,
            );
            if (!realmOutcome.success) {
                continue;
            }

            const policies : BasePolicy[] = grant.policies || [];
            if (policies.length === 0) {
                // Reach matches and this grant carries no further restriction.
                return { success: maybeInvertPolicyOutcome(true, policy.invert) };
            }

            const compositePolicy : CompositePolicy = {
                type: BuiltInPolicyType.COMPOSITE,
                decision_strategy: grant.decision_strategy ?? undefined,
                children: policies,
            };

            // Missing evaluators is a misconfiguration: let the engine fail CLOSED with a
            // surfaced POLICY_EVALUATOR_NOT_FOUND issue (new PolicyEngine(undefined) defaults
            // to an empty registry, so the composite child resolves to no evaluator) rather
            // than swallowing the grant with a silent issue-less deny.
            const engine = new PolicyEngine(ctx.evaluators);
            const outcome = await engine.evaluate(compositePolicy, {
                ...ctx,
                path: [
                    ...(ctx.path || []),
                    ...(compositePolicy.type ? [compositePolicy.type] : []),
                ],
            });

            if (outcome.success) {
                return { success: maybeInvertPolicyOutcome(true, policy.invert) };
            }

            if (outcome.issues) {
                issues.push(...outcome.issues);
            }
        }

        // No grant term satisfied (reach ∧ policies). Apply `invert` ONCE to the aggregated
        // disjunction outcome — never per term, which would corrupt the quantifier.
        const success = maybeInvertPolicyOutcome(false, policy.invert);
        return {
            success,
            issues: success ? [] : issues,
        };
    }
}
