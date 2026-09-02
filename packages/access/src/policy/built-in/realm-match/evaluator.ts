/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import {
    eq, 
    inArray, 
    nin, 
    not, 
    or,
} from '@rapiq/core';
import { DecisionStrategy, hasOwnProperty  } from '@authup/kit';
import { RealmScope, normalizeRealmScope, realmScopeMatches } from '../../../permission/realm-scope';
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

    /**
     * Condition form over the row's realm column, with the actor realm baked in
     * (mirrors `realmScopeMatches` / the attribute-mode match). Exactness holds for
     * row-shaped data where the referenced field exists (DB rows) — the object-bag
     * "key absent → neutral-pass" case has no SQL counterpart. Lowerable configs:
     * scope mode (field = single-string `attributeName`, default `realmId` — scope-mode
     * EVALUATION ignores `attributeName`, lowering reuses it as the column override),
     * and strict attribute mode with a single explicit `attributeName`. Everything
     * else (multi-key / default-key CONSENSUS, non-strict key expansion) is
     * row-shape-dependent and stays a post-check.
     */
    async toCondition(value: Record<string, any>, ctx: PolicyEvaluationContext) : Promise<ICondition | null> {
        let policy;
        try {
            policy = await this.validator.run(value);
        } catch {
            return null;
        }

        const identity = await this.identityEvaluator.accessData(ctx);
        if (!identity) {
            return null;
        }

        const realmId = identity.realmId ?? null;

        if (policy.scope) {
            const scope = normalizeRealmScope(policy.scope);
            const field = typeof policy.attributeName === 'string' ?
                policy.attributeName :
                'realmId';

            let condition : ICondition;
            if (scope === RealmScope.ANY) {
                // constant-true: nin([]) matches everything (rapiq ConstantPlan)
                condition = nin(field, []);
            } else {
                // The lowered column (default `realmId`) holds realm IDs — the resource
                // realm is stamped from `entity.realmId`
                // (AbstractEntityService.resourceRealmMatch), so the WHERE match compares
                // that ID column against the actor's realm ID. The realm NAME is
                // deliberately NOT pushed here: it never appears in a realmId column and
                // would bind a non-uuid literal that postgres/mysql reject against a uuid
                // column (the sqlite-only test suite masks this, since sqlite is untyped).
                // Settled evaluation keeps the name-equality leniency for a name-stamped
                // resource SCALAR — which has no row-column counterpart, so parity holds
                // for realistic row-shaped data (see the exactness caveat above).
                const terms : ICondition[] = [];
                if (realmId !== null && scope !== RealmScope.NONE) {
                    terms.push(eq(field, realmId));
                }
                if (scope === RealmScope.OWN_OR_NULL) {
                    terms.push(eq(field, null));
                }

                if (terms.length === 0) {
                    // no reach / realm-less actor with no null branch — constant-false
                    condition = inArray(field, []);
                } else if (terms.length === 1) {
                    condition = terms[0]!;
                } else {
                    condition = or(...terms);
                }
            }

            return policy.invert ? not(condition) : condition;
        }

        if (
            typeof policy.attributeName !== 'string' ||
            (policy.attributeNameStrict ?? true) === false
        ) {
            return null;
        }

        // Mirrors the match loop's strict equality: `attributeValue === identity.realmId`
        // — an identity carrying an explicit `realmId: null` matches null-valued rows
        // (only an UNDEFINED identity value never matches a DB value, so it drops out).
        const key = policy.attributeName;
        const terms : ICondition[] = [];
        if (policy.attributeNullMatchAll) {
            terms.push(eq(key, null));
        }
        if (identity.realmId !== undefined) {
            terms.push(eq(key, identity.realmId));
        }
        if (identity.realmName !== undefined) {
            terms.push(eq(key, identity.realmName));
        }

        if (terms.length === 0) {
            return policy.invert ? nin(key, []) : inArray(key, []);
        }

        const condition = terms.length === 1 ? terms[0]! : or(...terms);
        return policy.invert ? not(condition) : condition;
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
                // mirroring the attribute-mode non-evaluation pass below. For a
                // query-build caller (`withConditions`) the resource realm IS the
                // unknown row column, so the reach pends with its condition form
                // instead of neutral-passing.
                if (ctx.withConditions) {
                    const condition = await this.toCondition(value, ctx);
                    return {
                        success: false,
                        pending: true,
                        ...(condition ? { condition } : {}),
                    };
                }

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
                (attributeValue === null && policy.attributeNullMatchAll) ||
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
