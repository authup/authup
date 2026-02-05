/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { PolicyIssueSeverity } from '../error';
import type {
    IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult, PolicyEvaluators,
} from '../evaluator';
import { maybeInvertPolicyOutcome } from '../helpers';
import type { PolicyIssue } from '../issue';
import type { IPolicy, PolicyData } from '../types.ts';
import type { IPolicyEngine } from './types.ts';

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
        for (let i = 0; i < keys.length; i++) {
            this.registerEvaluator(keys[i], evaluators[keys[i]]);
        }
    }

    /**
     * @param policy
     * @param data
     * @param context
     */
    async evaluate(policy: IPolicy, data: PolicyData, context: PolicyEvaluationContext = {}) : Promise<PolicyEvaluationResult> {
        if (
            context.exclude &&
            context.exclude.length > 0 &&
            context.exclude.indexOf(policy.type) !== -1
        ) {
            return {
                success: maybeInvertPolicyOutcome(true, policy.invert),
            };
        }

        if (
            context.include &&
            context.include.length > 0 &&
            context.include.indexOf(policy.type) === -1
        ) {
            return {
                success: maybeInvertPolicyOutcome(true, policy.invert),
            };
        }

        const issues : PolicyIssue[] = [];

        const evaluator = this.evaluators[policy.type];
        if (!evaluator) {
            // todo: add issue here instead + return false ?
            issues.push({
                path: [policy.type],
                message: `The policy ${policy.type} can not be handled by any evaluator.`,
                code: ErrorCode.POLICY_EVALUATOR_NOT_FOUND,
                severity: PolicyIssueSeverity.ERROR,
            });

            return {
                success: maybeInvertPolicyOutcome(false, policy.invert),
                issues,
            };
        }

        try {
            return await evaluator.evaluate(policy, data, {
                ...context,
                evaluators: {
                    ...this.evaluators,
                    ...(context.evaluators || {}),
                },
            });
        } catch (e) {
            issues.push({
                path: [policy.type],
                message: `The ${policy.type} evaluator can not process the policy specification.`,
                code: ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE,
                severity: PolicyIssueSeverity.ERROR,
            });

            return {
                success: maybeInvertPolicyOutcome(false, policy.invert),
                issues,
            };
        }
    }
}
