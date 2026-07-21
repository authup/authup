/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy, hasOwnProperty  } from '@authup/kit';
import { realmScopeMatches } from '../../../permission/realm-scope';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { AttributesPolicyEvaluator } from '../attributes';
import { BuiltInPolicyType } from '../constants';
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

    requires(value: Record<string, any>) : string[] {
        // SCOPE MODE: the resource realm key (REALM_MATCH) is deliberately NOT
        // required — an absent key is the documented neutral-pass (gate checks /
        // realm-less resources), so requiring it would wrongly pend those runs.
        if (value.scope) {
            return [BuiltInPolicyType.IDENTITY];
        }

        return [BuiltInPolicyType.IDENTITY, BuiltInPolicyType.ATTRIBUTES];
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

        // SCOPE MODE: coarse, actor-relative realm reach (the realmScope mechanism lives
        // here). The resource realm is supplied under the REALM_MATCH data key. Key-PRESENCE
        // is the discriminator: an ABSENT realm neutral-passes (gate check / realm-less
        // resource), while a present `null` (global resource) is matched (and `own` correctly
        // denies it). Runs BEFORE the attributes-required guard below, since junction / gate
        // inputs need not carry ATTRIBUTES.
        if (policy.scope) {
            if (!ctx.data || !ctx.data.has(BuiltInPolicyType.REALM_MATCH)) {
                // Non-evaluation (no resource realm) — neutral pass, no `invert`,
                // mirroring the attribute-mode non-evaluation pass below.
                return { success: true };
            }

            const resourceRealm = ctx.data.get<string | string[] | null>(BuiltInPolicyType.REALM_MATCH);
            return {
                success: maybeInvertPolicyOutcome(
                    realmScopeMatches(
                        policy.scope,
                        resourceRealm ?? null,
                        identity.realmId,
                        identity.realmName,
                    ),
                    policy.invert,
                ),
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
                    return { success: maybeInvertPolicyOutcome(true, policy.invert) };
                }

                count++;
            } else {
                if (policy.decisionStrategy === DecisionStrategy.UNANIMOUS) {
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
