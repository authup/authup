/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import { DecisionStrategy } from '../../../constants';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { AttributesPolicyEvaluator } from '../attributes';
import { IdentityPolicyEvaluator } from '../identity';
import { RealmMatchPolicyValidator } from './validator';

export class RealmMatchPolicyEvaluator implements IPolicyEvaluator {
    protected validator : RealmMatchPolicyValidator;

    protected identityEvaluator: IdentityPolicyEvaluator;

    protected attributesEvaluator : AttributesPolicyEvaluator;

    constructor() {
        this.validator = new RealmMatchPolicyValidator();
        this.identityEvaluator = new IdentityPolicyEvaluator();
        this.attributesEvaluator = new AttributesPolicyEvaluator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        const identity = await this.identityEvaluator.accessData(ctx);
        if (!identity) {
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

        const attributes = await this.attributesEvaluator.accessData(ctx);
        if (!attributes) {
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

        const identityMasterMatchAll = policy.identity_master_match_all ?? true;
        if (
            identityMasterMatchAll &&
            identity.realmName &&
            identity.realmName === 'master'
        ) {
            // Master-match-all is a privileged-actor override — do NOT apply
            // `invert`. Inverting would deny master access whenever the policy
            // is configured as a denylist, which is the opposite of the flag's
            // intent.
            return { success: true };
        }

        let keys : string[];
        if (policy.attribute_name) {
            if (Array.isArray(policy.attribute_name)) {
                keys = policy.attribute_name;
            } else {
                keys = [policy.attribute_name];
            }
        } else {
            keys = [
                'realm_id',
                'realm_name',
                'realmId',
                'realmName',
            ];

            policy.decision_strategy = DecisionStrategy.CONSENSUS;
        }

        const attribute_name_strict = policy.attribute_name_strict ?? true;
        if (!attribute_name_strict) {
            const resourceKeys = Object.keys(attributes);
            const keysToAdd : string[] = [];
            for (const resourceKey of resourceKeys) {
                let contains : boolean = false;

                for (const key of keys) {
                    if (
                        resourceKey !== key &&
                        resourceKey.includes(key)
                    ) {
                        contains = true;
                        break;
                    }
                }

                if (contains) {
                    keysToAdd.push(resourceKey);
                }
            }

            if (keysToAdd.length > 0) {
                keys.push(...keysToAdd);
            }
        }

        let count = 0;
        let evaluated = false;

        for (const key of keys) {
            if (!hasOwnProperty(attributes, key)) {
                continue;
            }

            evaluated = true;

            let outcome : boolean = false;

            const attributeValue = attributes[key];

            if (
                attributeValue === null &&
                policy.attribute_null_match_all
            ) {
                outcome = true;
            } else if (
                attributeValue === identity.realmId ||
                attributeValue === identity.realmName
            ) {
                outcome = true;
            }

            if (outcome) {
                if (policy.decision_strategy === DecisionStrategy.AFFIRMATIVE) {
                    return { success: maybeInvertPolicyOutcome(true, policy.invert) };
                }

                count++;
            } else {
                if (policy.decision_strategy === DecisionStrategy.UNANIMOUS) {
                    return { success: maybeInvertPolicyOutcome(false, policy.invert) };
                }

                count--;
            }
        }

        if (!evaluated) {
            // No realm key found in attributes — the policy's match logic
            // didn't run. This is a "non-evaluation", not an outcome; treat
            // as a neutral pass without applying `invert`. Inverting here
            // would conflate "policy doesn't apply" with "policy denies".
            return { success: true };
        }

        return { success: maybeInvertPolicyOutcome(count > 0, policy.invert) };
    }
}
