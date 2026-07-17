/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue } from 'validup';
import type {
    IPolicyEvaluator,
    PermissionPolicyBindingAggregated,
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
    aggregatePermissionPolicyBindings,
    definePolicyIssueItem,
    maybeInvertPolicyOutcome,
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

    async accessData(ctx: PolicyEvaluationContext) : Promise<PermissionPolicyBindingAggregated | null> {
        if (!ctx.data.has(BuiltInPolicyType.PERMISSION_BINDING)) {
            return null;
        }

        if (ctx.data.isValidated(BuiltInPolicyType.PERMISSION_BINDING)) {
            return ctx.data.get(BuiltInPolicyType.PERMISSION_BINDING);
        }

        const data = ctx.data.get<PermissionPolicyBindingAggregated>(BuiltInPolicyType.PERMISSION_BINDING);

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

                return (binding.permission.realmId ?? null) === (item.permission.realmId ?? null) &&
                    (binding.permission.clientId ?? null) === (item.permission.clientId ?? null);
            }));

        if (identityBindings.length === 0) {
            return { success: maybeInvertPolicyOutcome(false, policy.invert) };
        }

        const [aggr] = aggregatePermissionPolicyBindings(identityBindings);
        if (!aggr) {
            return { success: maybeInvertPolicyOutcome(false, policy.invert) };
        }

        // identityBindings is filtered to a single (name, realm_id, client_id) key, so the
        // aggregate yields exactly one entry whose `grants` are the actor's per-grant
        // (realm_scope, policy) disjunction terms; access is the DISJUNCTION over them:
        //   ∃ grant . realmScopeMatches(grant.realmScope, resource) ∧ (grant.policy passes)
        // Pairing each grant's realm reach with its OWN policy is what fixes both the mixed
        // policy-free + policy-bound UNDER-grant (a policy-free `own` grant must not mask a
        // policy-bound `any` grant's wider reach) and the symmetric OVER-grant (an `own`
        // grant's passing policy must not ride an `any` grant's wider reach).
        const issues : Issue[] = [];
        for (const grant of aggr.grants) {
            // Realm reach (coarse, actor-relative) — a SEPARATE factor from the grant's
            // policy, ANDed with it. The realm-match evaluator runs in SCOPE MODE: it reads the
            // resource realm from ctx.data[REALM_MATCH] (fallback ATTRIBUTES.realmId) and
            // neutral-passes when absent (preEvaluate / gate checks / realm-less resources) —
            // key-PRESENCE is the discriminator. Invoked DIRECTLY (not via PolicyEngine —
            // REALM_MATCH is in policiesExcluded, so the engine would skip it).
            const realmOutcome = await this.realmMatchEvaluator.evaluate(
                { scope: grant.realmScope },
                ctx,
            );
            if (!realmOutcome.success) {
                continue;
            }

            if (!grant.policy) {
                // Reach matches and this grant carries no further restriction.
                return { success: maybeInvertPolicyOutcome(true, policy.invert) };
            }

            // Missing evaluators is a misconfiguration: let the engine fail CLOSED with a
            // surfaced POLICY_EVALUATOR_NOT_FOUND issue (new PolicyEngine(undefined) defaults
            // to an empty registry, so grant.policy resolves to no evaluator) rather than
            // swallowing the grant with a silent issue-less deny.
            const engine = new PolicyEngine(ctx.evaluators);
            const outcome = await engine.evaluate(grant.policy, {
                ...ctx,
                path: [
                    ...(ctx.path || []),
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
