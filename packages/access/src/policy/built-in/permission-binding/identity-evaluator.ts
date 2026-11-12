/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue } from '@ebec/core';
import type { PermissionPolicyBinding, PermissionPolicyBindingAggregated } from '../../../permission/types';
import { aggregatePermissionPolicyBindings } from '../../../permission/helpers';
import { RealmScope, normalizeRealmScope } from '../../../permission/realm-scope';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { PolicyEngine } from '../../engine';
import type { PolicyWithType } from '../../types';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { PolicyError, isPolicyError } from '../../error';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { BuiltInPolicyType } from '../constants';
import { IdentityPolicyEvaluator } from '../identity';
import type { IdentityPolicyData } from '../identity';
import { RealmMatchPolicyEvaluator } from '../realm-match';
import type { PolicySide, PolicySides } from '../../side';
import {
    POLICY_SIDE_ALWAYS,
    POLICY_SIDE_NEVER,
    POLICY_SIDE_UNKNOWN,
    allOfPolicySides,
    anyOfPolicySides,
    invertPolicySides,
    readPolicySides,
    writePolicySides,
} from '../../side';
import { PermissionBindingPolicyValidator } from './validator';

function containsPermissionBinding(policy: PolicyWithType) : boolean {
    if (policy.type === BuiltInPolicyType.PERMISSION_BINDING) {
        return true;
    }

    // only a composite evaluates its children, and the projection a consumer
    // walks (`containsBindingCheck`) keeps `children` on a composite alone
    if (policy.type !== BuiltInPolicyType.COMPOSITE) {
        return false;
    }

    const children = policy.children as unknown;

    return Array.isArray(children) &&
        children.some((child) => !!child && typeof child === 'object' && containsPermissionBinding(child));
}

export class IdentityPermissionBindingPolicyEvaluator implements IPolicyEvaluator {
    protected validator : PermissionBindingPolicyValidator;

    protected identityEvaluator: IdentityPolicyEvaluator;

    protected realmMatchEvaluator : RealmMatchPolicyEvaluator;

    constructor() {
        this.validator = new PermissionBindingPolicyValidator();
        this.identityEvaluator = new IdentityPolicyEvaluator();
        this.realmMatchEvaluator = new RealmMatchPolicyEvaluator();
    }

    requires() : string[] {
        // IDENTITY is deliberately NOT declared: declared, a missing identity
        // would pend, and the pre-gate permits pending. Undeclared, a missing
        // identity and an identity without grants are both not evaluable, which
        // the pre-gate never permits and `invert` never flips, so an anonymous
        // bearer still fails the pre-gate through system.default. A
        // scope-restricted bearer carries `grants: []` and settles a plain false.
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

    /**
     * The grants the identity holds. An identity carrying none is missing
     * data, which throws a PolicyError carrying the refusing issue.
     */
    accessGrants(
        ctx: PolicyEvaluationContext,
        identity: IdentityPolicyData,
    ) : PermissionPolicyBinding[] {
        if (!identity.grants) {
            throw new PolicyError('The identity grants are missing', undefined, [
                definePolicyIssueItem({
                    code: PolicyIssueCode.DATA_MISSING,
                    message: 'The identity grants are missing',
                    path: ctx.path,
                }),
            ]);
        }

        return identity.grants;
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        const policy = await this.validator.run(value);

        const identity = await this.identityEvaluator.accessData(ctx);

        if (!identity) {
            return {
                success: false,
                unevaluable: true,
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
                unevaluable: true,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property permission is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        let grants : PermissionPolicyBinding[];

        try {
            grants = this.accessGrants(ctx, identity);
        } catch (e) {
            if (isPolicyError(e)) {
                return {
                    success: false,
                    unevaluable: true,
                    issues: [...e.issues],
                };
            }

            throw e;
        }

        const identityBindings = grants.filter((item) => {
            if (item.permission.name !== binding.permission.name) {
                return false;
            }

            return (binding.permission.realmId ?? null) === (item.permission.realmId ?? null) &&
                (binding.permission.clientId ?? null) === (item.permission.clientId ?? null);
        });

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
        let unevaluable = false;

        // The rows each grant term passes for and the rows it fails for. A term is
        // `reach AND policy`: it passes where both do and fails where either does.
        // A term skipped below is a settled false, which adds nothing to either.
        const passes : PolicySide[] = [];
        const fails : PolicySide[] = [];

        for (const grant of aggr.grants) {
            // Realm reach (coarse, actor-relative) — a SEPARATE factor from the grant's
            // policy, ANDed with it. The realm-match evaluator runs in SCOPE MODE: it reads the
            // resource realm from ctx.data[REALM_MATCH] alone (never from ATTRIBUTES.realmId)
            // and neutral-passes when the key is absent (preEvaluate / gate checks / realm-less
            // resources): key-PRESENCE is the discriminator. Invoked DIRECTLY (not via PolicyEngine) so
            // the reach factor can never be skipped by a caller's include/exclude filters or
            // deferred by the engine's data-availability gate.
            //
            // Under `withConditions` (query-build) with no resource realm present, the
            // reach PENDS with its condition form over the row's realm column instead of
            // neutral-passing — `any` stays unrestricted and `none` reaches nothing, so
            // neither pollutes the composed WHERE with constant terms.
            let reach : PolicySides = { pass: POLICY_SIDE_ALWAYS, fail: POLICY_SIDE_NEVER };
            const realmOutcome = await this.realmMatchEvaluator.evaluate(
                // `attributeName` is read by scope mode only while LOWERING (it names the
                // row column the reach binds); settled evaluation takes the resource realm
                // from the `realmMatch` data key, so passing it cannot move an evaluate()
                // outcome. It is what lets a junction gate on its owner-realm key.
                { scope: grant.realmScope, attributeName: ctx.realmAttributeName },
                ctx,
            );

            if (realmOutcome.pending) {
                const scope = normalizeRealmScope(grant.realmScope);

                if (scope === RealmScope.NONE) {
                    continue;
                }

                if (scope !== RealmScope.ANY) {
                    reach = readPolicySides(realmOutcome);
                }
            } else if (!realmOutcome.success) {
                continue;
            }

            let sides : PolicySides;

            if (!grant.policy) {
                // This grant carries no further restriction: the reach is all of it.
                sides = { pass: POLICY_SIDE_ALWAYS, fail: POLICY_SIDE_NEVER };
            } else if (containsPermissionBinding(grant.policy)) {
                // A grant policy carrying a binding node re-enters this evaluator with the
                // same data, which loads the same grants and evaluates the same tree again,
                // without bound (issue #3633). The consumer side drops such a grant
                // (`containsBindingCheck`); the policy never passes here so the two agree.
                unevaluable = true;
                sides = { pass: POLICY_SIDE_NEVER, fail: POLICY_SIDE_NEVER };

                issues.push(definePolicyIssueItem({
                    code: PolicyIssueCode.INVALID,
                    message: 'A grant policy must not evaluate the permission binding.',
                    path: ctx.path,
                }));
            } else {
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

                sides = readPolicySides(outcome);

                // A PENDING junction policy (required data key absent — e.g. an ATTRIBUTES
                // policy at the pre-gate) leaves this grant term UNKNOWN, not failed: the
                // grant could still pass once the data arrives, so it must not settle the
                // disjunction to false.
                if (outcome.pending) {
                    // A caller that names its realm column has told us the row shape is not the
                    // default one, and nothing rebases a GRANT policy's own condition onto it.
                    // Authup's own junction reads are the case that proves it: the policy is the
                    // operator's, written against the ENTITY the permission names, so lowering it
                    // emits SQL over columns `auth_role_permissions` and its siblings do not have.
                    // We cannot tell a row shape that does carry those fields from one that does
                    // not, so refuse the class: its conditions count as unknown and the caller
                    // falls back to the per-row `post` branch, which evaluates the same policy
                    // against the real attributes and reaches the identical verdict wherever the
                    // pushdown would not have crashed. The grant's REACH is unaffected — it is
                    // built above from the column the caller named, so the policy-free grants that
                    // dominate real deployments still push down.
                    if (ctx.realmAttributeName) {
                        sides = {
                            pass: sides.pass.kind === 'condition' ? POLICY_SIDE_UNKNOWN : sides.pass,
                            fail: sides.fail.kind === 'condition' ? POLICY_SIDE_UNKNOWN : sides.fail,
                        };
                    }

                    if (outcome.issues) {
                        pendingIssues.push(...outcome.issues);
                    }
                } else {
                    // A grant policy that could not be evaluated leaves the term UNKNOWN
                    // for good: it never passes, and nothing may be concluded from that.
                    // The term still fails for every row out of a pending reach.
                    if (outcome.unevaluable) {
                        unevaluable = true;
                    }

                    if (outcome.issues) {
                        issues.push(...outcome.issues);
                    }
                }
            }

            const pass = allOfPolicySides([reach.pass, sides.pass]);

            if (pass.kind === 'always') {
                // Reach matches and the grant's policy passes (or it carries none).
                return { success: maybeInvertPolicyOutcome(true, policy.invert) };
            }

            passes.push(pass);
            fails.push(anyOfPolicySides([reach.fail, sides.fail]));
        }

        // No grant term settled true. The disjunction passes where some term does and
        // fails where every term does; the node's own `invert` swaps the two sides
        // ONCE, never per term, which would corrupt the quantifier. Both sides are
        // exact, so the swap never reads a row a term could not be evaluated for as
        // a failure.
        const sides = invertPolicySides({
            pass: anyOfPolicySides(passes),
            fail: allOfPolicySides(fails),
        }, policy.invert);

        if (sides.pass.kind === 'always') {
            return { success: true, issues: [] };
        }

        if (sides.fail.kind === 'always') {
            return { success: false, issues };
        }

        // A term could not be evaluated and nothing pending could still decide the
        // disjunction: it is unevaluable itself, which `invert` is never applied to.
        if (sides.pass.kind === 'never' && sides.fail.kind === 'never') {
            return {
                success: false,
                unevaluable: true,
                issues,
            };
        }

        // Some term is still pending, so the disjunction is: deliberately uninverted
        // (unknown stays unknown under negation). It says which settled outcome is
        // still open (`reachable`) and, on request, the condition of each side that
        // is expressible. A single non-expressible grant term makes the pass side
        // non-expressible (pushing a partial OR would wrongly exclude rows).
        return {
            success: false,
            pending: true,
            ...writePolicySides(sides, ctx.withConditions),
            issues: unevaluable ? [...pendingIssues, ...issues] : pendingIssues,
        };
    }
}
