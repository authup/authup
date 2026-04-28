/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { defineIssueItem } from 'validup';
import type {
    IPolicyEvaluator,
    PolicyEvaluationContext,
    PolicyEvaluationResult,
    PolicyEvaluators,
} from '../evaluation';
import type { PolicyIssue } from '../issue';
import type { IPolicyEngine } from './types.ts';
import { PolicyError, isPolicyError } from '../error';
import type { BasePolicy } from '../types.ts';

// Cross-realm-safe extraction of an error message from an unknown thrown
// value. `instanceof Error` is unreliable across module boundaries (different
// realms, dual-bundled packages), so we duck-type on the `message` shape.
function errorMessage(value: unknown): string {
    if (
        typeof value === 'object' &&
        value !== null &&
        'message' in value &&
        typeof (value as { message: unknown }).message === 'string'
    ) {
        return (value as { message: string }).message;
    }
    return String(value);
}

/**
 * The policy engine is a component that interprets defined policies and makes decisions
 * on whether to allow or deny a particular access.
 */
export class PolicyEngine implements IPolicyEngine {
    protected evaluators : Record<string, IPolicyEvaluator>;

    constructor(evaluators: PolicyEvaluators = {}) {
        this.evaluators = evaluators;
    }

    public registerEvaluator(
        type: string,
        evaluator: IPolicyEvaluator,
    ) : void {
        this.evaluators[type] = evaluator;
    }

    public registerEvaluators(evaluators: PolicyEvaluators) {
        const keys = Object.keys(evaluators);
        for (const key of keys) {
            this.registerEvaluator(key, evaluators[key]!);
        }
    }

    /**
     * @param policy
     * @param ctx
     */
    async evaluate(policy: BasePolicy, ctx: PolicyEvaluationContext) : Promise<PolicyEvaluationResult> {
        // Infrastructure errors (no type, no evaluator, evaluator threw) MUST
        // fail closed regardless of `policy.invert`. Inverting an error path
        // would silently grant access on misconfiguration — with `invert: true`
        // an unregistered policy type would return success: true.
        if (!policy.type) {
            return {
                success: false,
                issues: [
                    defineIssueItem({
                        path: [],
                        message: 'The policy can not be handled by any evaluator.',
                        code: ErrorCode.POLICY_EVALUATOR_NOT_FOUND,
                    }),
                ],
            };
        }
        // When a policy is filtered out via include/exclude, treat it as a
        // neutral pass — do NOT apply `invert`. Inversion only makes sense
        // for an actual evaluation outcome; skipping a policy because it's
        // outside the current context's scope is not an outcome.
        if (
            ctx.exclude &&
            ctx.exclude.length > 0 &&
            ctx.exclude.includes(policy.type)
        ) {
            return { success: true };
        }

        if (
            ctx.include &&
            ctx.include.length > 0 &&
            !ctx.include.includes(policy.type)
        ) {
            return { success: true };
        }

        const issues : PolicyIssue[] = [];

        const evaluator = this.evaluators[policy.type];
        if (!evaluator) {
            issues.push(defineIssueItem({
                path: [policy.type],
                message: `The policy ${policy.type} can not be handled by any evaluator.`,
                code: ErrorCode.POLICY_EVALUATOR_NOT_FOUND,
            }));

            return {
                success: false,
                issues,
            };
        }

        try {
            return await evaluator.evaluate(policy, {
                ...ctx,
                evaluators: {
                    ...this.evaluators,
                    ...(ctx.evaluators || {}),
                },
            });
        } catch (e) {
            issues.push(defineIssueItem({
                path: [policy.type],
                message: `The ${policy.type} evaluator threw: ${errorMessage(e)}`,
                code: ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE,
            }));

            return {
                success: false,
                issues,
            };
        }
    }

    async evaluateOrFail(policy: BasePolicy, ctx: PolicyEvaluationContext) : Promise<void> {
        const issues : PolicyIssue[] = [];

        try {
            const outcome = await this.evaluate(policy, ctx);
            if (outcome.success) {
                return;
            }

            if (outcome.issues) {
                issues.push(...outcome.issues);
            }
        } catch (e) {
            if (isPolicyError(e)) {
                throw e;
            }

            // Surface non-PolicyError throws (DB failures, validator crashes, etc.)
            // as issues so the root cause is visible instead of being swallowed
            // behind a generic policy failure.
            issues.push(defineIssueItem({
                path: policy.type ? [policy.type] : [],
                message: errorMessage(e),
                code: ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE,
            }));
        }

        const error = new PolicyError(`The policy ${policy.type} evaluation failed.`);
        error.addIssues(issues);

        throw error;
    }
}
