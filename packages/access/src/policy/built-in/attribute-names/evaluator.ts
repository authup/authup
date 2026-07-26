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
import { BuiltInPolicyType } from '../constants';

export class AttributeNamesPolicyEvaluator implements IPolicyEvaluator {
    protected validator : AttributeNamesPolicyValidator;

    protected attributesEvaluator : AttributesPolicyEvaluator;

    constructor() {
        this.validator = new AttributeNamesPolicyValidator();
        this.attributesEvaluator = new AttributesPolicyEvaluator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // The policy settles against EITHER data key: the ATTRIBUTE_NAMES key carries a
        // plain projection/fieldset (string[]) — "may this actor project these field
        // names", answerable before any row exists — while the ATTRIBUTES record keeps
        // its established key semantics. The tri-state lives HERE instead of a
        // `requires()` declaration: the engine's requires-gate is AND-semantics over the
        // declared keys, so declaring both would pend every bag carrying only one of
        // them. Checked before the validator run so gate-style calls with an empty bag
        // stay cheap.
        const hasNames = ctx.data.has(BuiltInPolicyType.ATTRIBUTE_NAMES);
        const hasAttributes = ctx.data.has(BuiltInPolicyType.ATTRIBUTES);

        if (!hasNames && !hasAttributes) {
            return {
                success: false,
                pending: true,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property attributeNames or attributes is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        // Conjunctive over the available sources: when both keys are present BOTH are
        // enforced — a reused bag that carries a projection alongside row attributes can
        // never weaken an existing record gate. Keys are deduplicated so a name present
        // in both sources yields one issue.
        const keys = new Set<string>();

        if (hasNames) {
            // Non-string entries fail closed as invalid data — silently skipping
            // them would fail open in denylist (invert) mode.
            const data = ctx.data.get(BuiltInPolicyType.ATTRIBUTE_NAMES);
            if (
                !Array.isArray(data) ||
                data.some((entry) => typeof entry !== 'string')
            ) {
                return {
                    success: false,
                    issues: [
                        definePolicyIssueItem({
                            code: PolicyIssueCode.DATA_INVALID,
                            message: 'The data property attributeNames must be a list of attribute names',
                            path: ctx.path,
                        }),
                    ],
                };
            }

            for (const entry of data) {
                keys.add(entry);
            }
        }

        if (hasAttributes) {
            const data = await this.attributesEvaluator.accessData(ctx);
            if (data) {
                // Nested paths are a deliberate feature: an attribute object like
                // `{user: {name: 'x'}}` flattens to `{'user.name': 'x'}` and is matched
                // against `names` entries with dotted notation. Allowlists/denylists
                // that need to govern nested fields must use the dotted-path form
                // (e.g. `'user.realmId'`); a top-level entry like `'realmId'` will
                // NOT catch a nested `user.realmId` write — that's by design, the
                // policy is precise about which path it covers.
                const attributes = flattenObject(data);
                for (const key of Object.keys(attributes)) {
                    keys.add(key);
                }
            }
        }

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
