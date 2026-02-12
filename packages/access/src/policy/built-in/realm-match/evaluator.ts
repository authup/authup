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

        const identityMasterMatchAll = policy.identityMasterMatchAll ?? true;
        if (
            identityMasterMatchAll &&
            identity.realmName &&
            identity.realmName === 'master'
        ) {
            return {
                success: maybeInvertPolicyOutcome(true, policy.invert),
            };
        }

        let keys : string[];
        if (policy.attributeName) {
            if (Array.isArray(policy.attributeName)) {
                keys = policy.attributeName;
            } else {
                keys = [policy.attributeName];
            }
        } else {
            keys = [
                'realm_id',
                'realm_name',
                'realmId',
                'realmName',
            ];

            policy.decisionStrategy = DecisionStrategy.CONSENSUS;
        }

        const attributeNameStrict = policy.attributeNameStrict ?? true;
        if (!attributeNameStrict) {
            const resourceKeys = Object.keys(attributes);
            const keysToAdd : string[] = [];
            for (let i = 0; i < resourceKeys.length; i++) {
                let contains : boolean = false;

                for (let j = 0; j < keys.length; j++) {
                    if (
                        resourceKeys[i] !== keys[j] &&
                        resourceKeys[i].includes(keys[j])
                    ) {
                        contains = true;
                        break;
                    }
                }

                if (contains) {
                    keysToAdd.push(resourceKeys[i]);
                }
            }

            if (keysToAdd.length > 0) {
                keys.push(...keysToAdd);
            }
        }

        let count = 0;

        for (let i = 0; i < keys.length; i++) {
            if (!hasOwnProperty(attributes, keys[i])) {
                continue;
            }

            let outcome : boolean = false;

            const attributeValue = attributes[keys[i]];

            if (
                attributeValue === null &&
                policy.attributeNullMatchAll
            ) {
                outcome = true;
            } else if (
                attributeValue === identity.realmId ||
                attributeValue === identity.realmName
            ) {
                outcome = true;
            }

            if (outcome) {
                if (policy.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return {
                        success: maybeInvertPolicyOutcome(true, policy.invert),
                    };
                }

                count++;
            } else {
                if (policy.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return {
                        success: maybeInvertPolicyOutcome(false, policy.invert),
                    };
                }

                count--;
            }
        }

        return {
            success: maybeInvertPolicyOutcome(count > 0, policy.invert),
        };
    }
}
