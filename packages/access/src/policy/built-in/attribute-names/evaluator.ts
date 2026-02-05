/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenObject } from '@authup/kit';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyIssue } from '../../issue';
import { PolicyIssueCode, definePolicyIssue } from '../../issue';
import { AttributeNamesPolicyValidator } from './validator';

export class AttributeNamesPolicyEvaluator implements IPolicyEvaluator {
    protected validator : AttributeNamesPolicyValidator;

    constructor() {
        this.validator = new AttributeNamesPolicyValidator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        if (!ctx.data.has('attributes')) {
            return {
                success: false,
                issues: [
                    definePolicyIssue({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property attributes is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        let data : Record<string, any>;
        if (ctx.data.isValidated('attributes')) {
            data = ctx.data.get<Record<string, any>>('attributes');
        } else {
            data = await this.dataValidator.run(ctx.data.get('attributes'));

            ctx.data.set('attributes', data);
            ctx.data.setValidated('attributes');
        }

        const attributes = flattenObject(data);
        const keys = Object.keys(attributes);

        const issues : PolicyIssue[] = [];
        for (let i = 0; i < keys.length; i++) {
            const index = policy.names.indexOf(keys[i]);
            if (index === -1) {
                issues.push(definePolicyIssue({
                    code: PolicyIssueCode.EVALUATION_DENIED,
                    message: `The attribute ${keys[i]} is not included`,
                    path: [...ctx.path, i],
                }));
            }
        }

        return { success: maybeInvertPolicyOutcome(issues.length === 0, policy.invert), issues };
    }
}
