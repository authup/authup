/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../../../constants';
import { PolicyEngine } from '../../engine';
import type {
    IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult,
} from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyIssue } from '../../issue';
import { CompositePolicyValidator } from './validator';

export class CompositePolicyEvaluator implements IPolicyEvaluator {
    protected validator : CompositePolicyValidator;

    constructor() {
        this.validator = new CompositePolicyValidator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        let count = 0;

        const decisionStrategy = policy.decisionStrategy ??
            DecisionStrategy.UNANIMOUS;

        const engine = new PolicyEngine(ctx.evaluators);
        const issues : PolicyIssue[] = [];

        for (let i = 0; i < policy.children.length; i++) {
            const childPolicy = policy.children[i];

            const outcome = await engine.evaluate(childPolicy, {
                ...ctx,
                path: [...(ctx.path || []), childPolicy.type],
            });

            if (outcome.success) {
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return {
                        success: maybeInvertPolicyOutcome(true, policy.invert),
                        issues: outcome.issues,
                    };
                }

                count++;
            } else {
                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return {
                        success: maybeInvertPolicyOutcome(false, policy.invert),
                        issues: outcome.issues,
                    };
                }

                count--;
            }

            if (outcome.issues) {
                issues.push(...outcome.issues);
            }
        }

        return {
            success: maybeInvertPolicyOutcome(count > 0, policy.invert),
            issues,
        };
    }
}
