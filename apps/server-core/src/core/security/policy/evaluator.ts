/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import { and, or } from '@rapiq/core';
import type { Issue } from '@ebec/core';
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
    RealmScope,
    aggregatePermissionPolicyBindings,
    definePolicyIssueItem,
    maybeInvertPolicyOutcome,
    normalizeRealmScope,
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

    requires() : string[] {
        // IDENTITY is deliberately NOT declared: a missing identity must stay a
        // settled DATA_MISSING deny (fail-closed) so a scope-restricted or anonymous
        // bearer still fails the pre-gate through system.default — pending would be
        // permitted there.
        return [BuiltInPolicyType.PERMISSION_BINDING];
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
        const pendingIssues : Issue[] = [];
        const conditions : ICondition[] = [];
        let pending = false;
        let lowerable = true;
        for (const grant of aggr.grants) {
            // Realm reach (coarse, actor-relative) — a SEPARATE factor from the grant's
            // policy, ANDed with it. The realm-match evaluator runs in SCOPE MODE: it reads the
            // resource realm from ctx.data[REALM_MATCH] (fallback ATTRIBUTES.realmId) and
            // neutral-passes when absent (preEvaluate / gate checks / realm-less resources) —
            // key-PRESENCE is the discriminator. Invoked DIRECTLY (not via PolicyEngine) so
            // the reach factor can never be skipped by a caller's include/exclude filters or
            // deferred by the engine's data-availability gate.
            //
            // Under `withConditions` (query-build) with no resource realm present, the
            // reach PENDS with its condition form over the row's realm column instead of
            // neutral-passing — `any` stays unrestricted and `none` reaches nothing, so
            // neither pollutes the composed WHERE with constant terms.
            let reachCondition : ICondition | null = null;
            const realmOutcome = await this.realmMatchEvaluator.evaluate(
                { scope: grant.realmScope },
                ctx,
            );
            if (realmOutcome.pending) {
                const scope = normalizeRealmScope(grant.realmScope);
                if (scope === RealmScope.NONE) {
                    continue;
                }

                if (scope !== RealmScope.ANY) {
                    if (!realmOutcome.condition) {
                        pending = true;
                        lowerable = false;
                        continue;
                    }

                    reachCondition = realmOutcome.condition;
                }
            } else if (!realmOutcome.success) {
                continue;
            }

            if (!grant.policy) {
                if (!reachCondition) {
                    // Reach matches and this grant carries no further restriction.
                    return { success: maybeInvertPolicyOutcome(true, policy.invert) };
                }

                // Reach is the grant's only restriction — a pure condition term.
                conditions.push(reachCondition);
                pending = true;
                continue;
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
                if (!reachCondition) {
                    return { success: maybeInvertPolicyOutcome(true, policy.invert) };
                }

                conditions.push(reachCondition);
                pending = true;
                continue;
            }

            // A PENDING junction policy (required data key absent — e.g. an ATTRIBUTES
            // policy at the pre-gate) leaves this grant term UNKNOWN, not failed: the
            // grant could still pass once the data arrives, so it must not settle the
            // disjunction to false.
            if (outcome.pending) {
                pending = true;

                if (ctx.withConditions && outcome.condition) {
                    conditions.push(
                        reachCondition ?
                            and(reachCondition, outcome.condition) :
                            outcome.condition,
                    );
                } else {
                    lowerable = false;
                }

                if (outcome.issues) {
                    pendingIssues.push(...outcome.issues);
                }

                continue;
            }

            if (outcome.issues) {
                issues.push(...outcome.issues);
            }
        }

        // No grant term settled true. If some term is still pending, the disjunction is
        // pending — deliberately uninverted (unknown stays unknown under negation). The
        // condition form composes the grant terms as a disjunction, all-or-nothing: a
        // single non-expressible grant term makes the whole binding non-expressible
        // (pushing a partial OR would wrongly exclude rows).
        if (pending) {
            const result : PolicyEvaluationResult = {
                success: false,
                pending: true,
                issues: pendingIssues,
            };

            if (lowerable && ctx.withConditions && conditions.length > 0) {
                result.condition = conditions.length === 1 ?
                    conditions[0]! :
                    or(...conditions);
            }

            return result;
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
