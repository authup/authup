/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineIssueGroup } from '@ebec/core';
import { DecisionStrategy } from '@authup/kit';
import { PolicyEngine } from '../../engine';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyIssue } from '../../issue';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
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
import { CompositePolicyValidator } from './validator';

export class CompositePolicyEvaluator implements IPolicyEvaluator {
    protected validator : CompositePolicyValidator;

    constructor() {
        this.validator = new CompositePolicyValidator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        // A composite policy with no children can never be satisfied — an empty
        // UNANIMOUS/CONSENSUS settles false and an empty AFFIRMATIVE settles
        // false — so a permission bound to one is permanently un-grantable.
        // Fail closed with an explicit diagnostic instead of settling `false`
        // with an empty issue list, which reads as an opaque "stale" permission
        // (#3304). Like the engine's unregistered-type handling, this
        // misconfiguration fails closed regardless of `invert`.
        if (policy.children.length === 0) {
            return {
                success: false,
                unevaluable: true,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.INVALID,
                        message: 'A composite policy must define at least one child policy.',
                        path: ctx.path,
                    }),
                ],
            };
        }

        let count = 0;
        let pending = 0;
        let unevaluable = 0;

        const decisionStrategy = policy.decisionStrategy ??
            DecisionStrategy.UNANIMOUS;

        const engine = new PolicyEngine(ctx.evaluators);
        const issues : PolicyIssue[] = [];
        const pendingIssues : PolicyIssue[] = [];
        const unevaluableIssues : PolicyIssue[] = [];

        // The rows each child passes for and the rows it fails for. An unevaluable
        // child holds for neither, a pending child for whatever it states.
        const passes : PolicySide[] = [];
        const fails : PolicySide[] = [];

        for (const childPolicy of policy.children) {
            const path = [
                ...(ctx.path || []),
                ...(childPolicy.type ? [childPolicy.type] : []),
            ];

            const outcome = await engine.evaluate(childPolicy, {
                ...ctx,
                path,
            });

            const sides = readPolicySides(outcome);

            passes.push(sides.pass);
            fails.push(sides.fail);

            // A pending child is UNKNOWN, not a failure: it neither counts nor
            // early-returns. Masking it to a settled value breaks under negation
            // (mask-then-negate ≠ negate-then-mask — issue #3286).
            if (outcome.pending) {
                pending++;

                if (outcome.issues && outcome.issues.length > 0) {
                    pendingIssues.push(defineIssueGroup({
                        message: `The evaluation of child policy ${childPolicy.type} is pending`,
                        issues: outcome.issues,
                        path,
                    }));
                }

                continue;
            }

            // An unevaluable child is UNKNOWN as well, but one that never resolves:
            // it neither counts nor early-returns, and a settled sibling may still
            // decide the node. Its issues are kept like those of a failure.
            if (outcome.unevaluable) {
                unevaluable++;

                if (outcome.issues) {
                    const childGroup = defineIssueGroup({
                        message: `The evaluation of child policy ${childPolicy.type} failed`,
                        issues: outcome.issues,
                        path,
                    });

                    issues.push(childGroup);
                    unevaluableIssues.push(childGroup);
                }

                continue;
            }

            if (outcome.success) {
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return {
                        success: maybeInvertPolicyOutcome(true, policy.invert),
                        issues: [],
                    };
                }

                count++;
            } else {
                if (outcome.issues) {
                    issues.push(defineIssueGroup({
                        message: `The evaluation of child policy ${childPolicy.type} failed`,
                        issues: outcome.issues || [],
                        path,
                    }));
                }

                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    const success = maybeInvertPolicyOutcome(false, policy.invert);

                    return {
                        success,
                        // When `invert` flips a child-failure into success,
                        // suppress the issue list — surfacing failure issues
                        // alongside `success: true` is misleading.
                        issues: success ? [] : [
                            defineIssueGroup({
                                message: `The evaluation of composite policy failed (${DecisionStrategy.UNANIMOUS})`,
                                issues,
                                path: ctx.path,
                            }),
                        ],
                    };
                }

                count--;
            }
        }

        const group = () => defineIssueGroup({
            message: `The evaluation of composite policy failed (${decisionStrategy})`,
            issues,
            path: ctx.path,
        });

        // The rows the node passes for and the rows it fails for, folded over the
        // children: an AFFIRMATIVE node passes where some child does and fails where
        // every child does, a UNANIMOUS node the other way round. Both sides are
        // exact, so `invert` is a swap and never reads a row that could not be
        // evaluated as a failure. A CONSENSUS threshold over row-dependent outcomes
        // never lowers and is not narrowed: it settles by count, pends on a pending
        // child without saying which way, and is unevaluable otherwise.
        let sides : PolicySides;

        switch (decisionStrategy) {
            case DecisionStrategy.AFFIRMATIVE: {
                sides = { pass: anyOfPolicySides(passes), fail: allOfPolicySides(fails) };

                break;
            }
            case DecisionStrategy.UNANIMOUS: {
                sides = { pass: allOfPolicySides(passes), fail: anyOfPolicySides(fails) };

                break;
            }
            default: {
                // CONSENSUS: final outcome is `count > 0`, each unknown worth ±1
                const unknown = pending + unevaluable;

                if (count - unknown > 0) {
                    sides = { pass: POLICY_SIDE_ALWAYS, fail: POLICY_SIDE_NEVER };
                } else if (count + unknown <= 0) {
                    sides = { pass: POLICY_SIDE_NEVER, fail: POLICY_SIDE_ALWAYS };
                } else if (pending > 0) {
                    sides = { pass: POLICY_SIDE_UNKNOWN, fail: POLICY_SIDE_UNKNOWN };
                } else {
                    sides = { pass: POLICY_SIDE_NEVER, fail: POLICY_SIDE_NEVER };
                }
            }
        }

        sides = invertPolicySides(sides, policy.invert);

        if (sides.pass.kind === 'always') {
            return { success: true };
        }

        if (sides.fail.kind === 'always') {
            return { success: false, issues: [group()] };
        }

        // No child pends and one could not be evaluated, or no settled outcome is
        // left to reach: the node is unevaluable itself, which `invert` is never
        // applied to.
        if (sides.pass.kind === 'never' && sides.fail.kind === 'never') {
            return {
                success: false,
                unevaluable: true,
                issues: [group()],
            };
        }

        // Unknown stays unknown: `invert` is deliberately NOT applied to the pending
        // SUCCESS. It swapped the sides above instead. The node says which settled
        // outcome is still open (`reachable`) and, on request, the condition of each
        // side that is expressible: one child without a condition on a side makes
        // that side non-expressible (pushing a single disjunct would wrongly
        // EXCLUDE rows), unless a sibling already decides it.
        return {
            success: false,
            pending: true,
            ...writePolicySides(sides, ctx.withConditions),
            issues: [...pendingIssues, ...unevaluableIssues],
        };
    }
}
