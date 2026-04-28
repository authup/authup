/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenObject } from '@authup/kit';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
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

        // Nested paths are a deliberate feature: an attribute object like
        // `{user: {name: 'x'}}` flattens to `{'user.name': 'x'}` and is matched
        // against `names` entries with dotted notation. Allowlists/denylists
        // that need to govern nested fields must use the dotted-path form
        // (e.g. `'user.realm_id'`); a top-level entry like `'realm_id'` will
        // NOT catch a nested `user.realm_id` write — that's by design, the
        // policy is precise about which path it covers.
        const attributes = flattenObject(data);
        const keys = Object.keys(attributes);

        // `invert` is consumed per-key, NOT at the result level:
        //   - allowlist (default): a key NOT in `names` is denied
        //   - denylist (invert: true): a key IN `names` is denied
        // Result-level inversion would break the empty-input case (a request
        // with no validated attributes would flip success → fail), and would
        // produce nonsensical "deny iff all keys are in the list" semantics
        // for partial inputs.
        const issues : PolicyIssue[] = [];
        for (const key of keys) {
            const inList = policy.names.includes(key);
            const denied = policy.invert ? inList : !inList;
            if (denied) {
                issues.push(definePolicyIssueItem({
                    code: PolicyIssueCode.EVALUATION_DENIED,
                    message: policy.invert ?
                        `The attribute ${key} is denied` :
                        `The attribute ${key} is not included`,
                    path: [...ctx.path, key],
                }));
            }
        }

        return {
            success: issues.length === 0,
            issues,
        };
    }
}
