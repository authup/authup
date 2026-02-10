/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenObject } from '@authup/kit';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyIssue } from '../../issue';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { AttributeNamesPolicyValidator } from './validator';
import { AttributesPolicyEvaluator } from '../attributes';

export class AttributeNamesPolicyEvaluator implements IPolicyEvaluator {
    protected validator : AttributeNamesPolicyValidator;

    protected attributesEvaluator : AttributesPolicyEvaluator;

    constructor() {
        this.validator = new AttributeNamesPolicyValidator();
        this.attributesEvaluator = new AttributesPolicyEvaluator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        const data = await this.attributesEvaluator.accessData(ctx);
        if (!data) {
            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property attributes is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        const attributes = flattenObject(data);
        const keys = Object.keys(attributes);

        const issues : PolicyIssue[] = [];
        for (let i = 0; i < keys.length; i++) {
            const index = policy.names.indexOf(keys[i]);
            if (index === -1) {
                issues.push(definePolicyIssueItem({
                    code: PolicyIssueCode.EVALUATION_DENIED,
                    message: `The attribute ${keys[i]} is not included`,
                    path: [...ctx.path, keys[i]],
                }));
            }
        }

        return {
            success: maybeInvertPolicyOutcome(issues.length === 0, policy.invert),
            issues,
        };
    }
}
