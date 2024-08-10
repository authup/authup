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
import type { PolicyEvaluationData } from '../../types';
import { maybeInvertPolicyOutcome } from '../../utils';
import { isRealmMatchPolicy } from './helper';
import type { RealmMatchPolicyOptions } from './types';

export class RealmMatchPolicyEvaluator implements PolicyEvaluator<RealmMatchPolicyOptions> {
    async canEvaluate(
        ctx: PolicyEvaluatorContext<any, any>,
    ) : Promise<boolean> {
        return isRealmMatchPolicy(ctx.options);
    }

    async evaluate(ctx: PolicyEvaluatorContext<
    RealmMatchPolicyOptions,
    PolicyEvaluationData
    >): Promise<boolean> {
        if (
            !isObject(ctx.data) ||
            !isObject(ctx.data.attributes) ||
            !isObject(ctx.data.identity)
        ) {
            throw PolicyError.evaluatorContextInvalid();
        }

        if (
            ctx.options.identityMasterMatchAll &&
            ctx.data.identity.realmName &&
            ctx.data.identity.realmName === 'master'
        ) {
            return maybeInvertPolicyOutcome(true, ctx.options.invert);
        }

        let keys : string[];
        if (ctx.options.attributeName) {
            if (Array.isArray(ctx.options.attributeName)) {
                keys = ctx.options.attributeName;
            } else {
                keys = [ctx.options.attributeName];
            }
        } else {
            keys = [
                'realm_id',
                'realm_name',
                'realmId',
                'realmName',
            ];
            ctx.options.decisionStrategy = DecisionStrategy.CONSENSUS;
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
                ctx.options.attributeNullMatchAll
            ) {
                outcome = true;
            } else if (
                attributeValue === ctx.data.identity.realmId ||
                attributeValue === ctx.data.identity.realmName
            ) {
                outcome = true;
            }

            if (outcome) {
                if (ctx.options.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.options.invert);
                }

                count++;
            } else {
                if (ctx.options.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.options.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.options.invert);
    }
}
