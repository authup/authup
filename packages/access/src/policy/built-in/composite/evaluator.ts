/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import { and, not, or } from '@rapiq/core';
import { defineIssueGroup } from 'validup';
import { DecisionStrategy } from '@authup/kit';
import { PolicyEngine } from '../../engine';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyIssue } from '../../issue';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
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

        const decisionStrategy = policy.decisionStrategy ??
            DecisionStrategy.UNANIMOUS;

        const engine = new PolicyEngine(ctx.evaluators);
        const issues : PolicyIssue[] = [];
        const pendingIssues : PolicyIssue[] = [];
        const pendingConditions : ICondition[] = [];
        let pendingWithoutCondition = 0;

        for (const childPolicy of policy.children) {
            const path = [
                ...(ctx.path || []),
                ...(childPolicy.type ? [childPolicy.type] : []),
            ];

            const outcome = await engine.evaluate(childPolicy, {
                ...ctx,
                path,
            });

            // A pending child is UNKNOWN, not a failure: it neither counts nor
            // early-returns. Masking it to a settled value breaks under negation
            // (mask-then-negate ≠ negate-then-mask — issue #3286).
            if (outcome.pending) {
                pending++;

                if (outcome.condition) {
                    pendingConditions.push(outcome.condition);
                } else {
                    pendingWithoutCondition++;
                }

                if (outcome.issues && outcome.issues.length > 0) {
                    pendingIssues.push(defineIssueGroup({
                        message: `The evaluation of child policy ${childPolicy.type} is pending`,
                        issues: outcome.issues,
                        path,
                    }));
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

        // Settle the remainder: the composite settles despite pending children only
        // when no resolution of those children could change the outcome.
        let settled : boolean | null;
        switch (decisionStrategy) {
            case DecisionStrategy.AFFIRMATIVE: {
                // every settled child failed; any pending child could still succeed
                settled = pending > 0 ? null : false;
                break;
            }
            case DecisionStrategy.UNANIMOUS: {
                // every settled child succeeded; any pending child could still fail
                settled = pending > 0 ? null : count > 0;
                break;
            }
            default: {
                // CONSENSUS: final outcome is `count > 0`, each pending worth ±1
                if (count - pending > 0) {
                    settled = true;
                } else if (count + pending <= 0) {
                    settled = false;
                } else {
                    settled = null;
                }
            }
        }

        if (settled === null) {
            // Unknown stays unknown — `invert` is deliberately NOT applied to the
            // pending SUCCESS. The condition form is composed structurally instead:
            // settled children are identity elements and drop out of the residual,
            // so AND residual = and(pending), OR residual = or(pending). Exact-only,
            // all-or-nothing per node: one pending child without a condition makes
            // the whole node non-expressible (an OR pushing a single disjunct would
            // wrongly EXCLUDE rows; a partial AND is a compiler-level optimization,
            // deliberately not done here). CONSENSUS thresholds over row-dependent
            // outcomes never lower. `invert` wraps the residual SYMBOLICALLY via
            // rapiq's null-inclusive-complement not() — negation applies to the
            // condition even though the pending success stays uninverted.
            let condition : ICondition | null = null;
            if (
                ctx.withConditions &&
                pendingWithoutCondition === 0 &&
                pendingConditions.length > 0 &&
                decisionStrategy !== DecisionStrategy.CONSENSUS
            ) {
                if (pendingConditions.length === 1) {
                    const [first] = pendingConditions;
                    condition = first ?? null;
                } else if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    condition = or(...pendingConditions);
                } else {
                    condition = and(...pendingConditions);
                }

                if (condition && policy.invert) {
                    condition = not(condition);
                }
            }

            return {
                success: false,
                pending: true,
                ...(condition ? { condition } : {}),
                issues: pendingIssues,
            };
        }

        if (settled) {
            return { success: maybeInvertPolicyOutcome(true, policy.invert) };
        }

        const success = maybeInvertPolicyOutcome(false, policy.invert);
        return {
            success,
            issues: success ? [] : [
                defineIssueGroup({
                    message: `The evaluation of composite policy failed (${decisionStrategy})`,
                    issues: issues || [],
                    path: ctx.path,
                }),
            ],
        };
    }
}
