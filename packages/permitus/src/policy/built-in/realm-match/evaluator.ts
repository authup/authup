/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';
import { DecisionStrategy } from '../../../constants';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import type { PolicyData, PolicyWithType } from '../../types';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants';
import type { RealmMatchPolicy } from './types';
import { RealmMatchPolicyValidator } from './validator';

export class RealmMatchPolicyEvaluator implements PolicyEvaluator<RealmMatchPolicy> {
    protected validator : RealmMatchPolicyValidator;

    constructor() {
        this.validator = new RealmMatchPolicyValidator();
    }

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.REALM_MATCH;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean> {
        if (
            !isObject(ctx.data.attributes) ||
            !isObject(ctx.data.identity)
        ) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<
    RealmMatchPolicy,
    PolicyData
    >): Promise<boolean> {
        if (!ctx.data.attributes || !ctx.data.identity) {
            throw PolicyError.evaluatorContextInvalid();
        }

        if (
            ctx.policy.identityMasterMatchAll &&
            ctx.data.identity.realmName &&
            ctx.data.identity.realmName === 'master'
        ) {
            return maybeInvertPolicyOutcome(true, ctx.policy.invert);
        }

        let keys : string[];
        if (ctx.policy.attributeName) {
            if (Array.isArray(ctx.policy.attributeName)) {
                keys = ctx.policy.attributeName;
            } else {
                keys = [ctx.policy.attributeName];
            }
        } else {
            keys = [
                'realm_id',
                'realm_name',
                'realmId',
                'realmName',
            ];
            ctx.policy.decisionStrategy = DecisionStrategy.CONSENSUS;
        }

        let count = 0;

        for (let i = 0; i < keys.length; i++) {
            if (!hasOwnProperty(ctx.data.attributes, keys[i])) {
                continue;
            }

            let outcome : boolean = false;

            const attributeValue = ctx.data.attributes[keys[i]];

            if (
                attributeValue === null &&
                ctx.policy.attributeNullMatchAll
            ) {
                outcome = true;
            } else if (
                attributeValue === ctx.data.identity.realmId ||
                attributeValue === ctx.data.identity.realmName
            ) {
                outcome = true;
            }

            if (outcome) {
                if (ctx.policy.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.policy.invert);
                }

                count++;
            } else {
                if (ctx.policy.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.policy.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.policy.invert);
    }
}
