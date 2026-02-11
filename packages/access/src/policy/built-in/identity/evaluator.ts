/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { PolicyIdentityDataValidator } from './data';
import type { IdentityPolicyData } from './types';
import { IdentityPolicyValidator } from './validator';

export class IdentityPolicyEvaluator implements IPolicyEvaluator {
    protected validator : IdentityPolicyValidator;

    protected dataValidator : PolicyIdentityDataValidator;

    constructor() {
        this.validator = new IdentityPolicyValidator();
        this.dataValidator = new PolicyIdentityDataValidator();
    }

    async accessData(ctx: PolicyEvaluationContext) : Promise<IdentityPolicyData | null> {
        if (!ctx.data.has('identity')) {
            return null;
        }

        if (ctx.data.isValidated('identity')) {
            return ctx.data.get<IdentityPolicyData>('identity');
        }

        const data = await this.dataValidator.run(ctx.data.get('identity'));

        ctx.data.set('identity', data);
        ctx.data.setValidated('identity');

        return data;
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        const data = await this.accessData(ctx);
        if (!data) {
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

        if (!policy.types || policy.types.length === 0) {
            return {
                success: maybeInvertPolicyOutcome(true, policy.invert),
            };
        }

        const typeAllowed = policy.types.indexOf(data.type) !== -1;
        if (typeAllowed) {
            return {
                success: maybeInvertPolicyOutcome(typeAllowed, policy.invert),
            };
        }

        return {
            success: maybeInvertPolicyOutcome(typeAllowed, policy.invert),
            issues: [
                definePolicyIssueItem({
                    code: PolicyIssueCode.EVALUATION_DENIED,
                    message: `The type ${data.type} is not covered by the policy configuration`,
                    path: ctx.path,
                }),
            ],
        };
    }
}
