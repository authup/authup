/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import type { PolicyEvaluationData } from '../../types';
import { invertPolicyOutcome } from '../../utils';
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
            ctx.options.masterMatchAll &&
            ctx.data.identity.realmName &&
            ctx.data.identity.realmName === 'master'
        ) {
            return invertPolicyOutcome(true, ctx.options.invert);
        }

        const idAttributes : string[] = [];
        if (ctx.options.attributeName) {
            if (Array.isArray(ctx.options.attributeName)) {
                idAttributes.push(...ctx.options.attributeName);
            } else {
                idAttributes.push(ctx.options.attributeName);
            }
        } else {
            idAttributes.push('realm_id');
        }

        for (let i = 0; i < idAttributes.length; i++) {
            if (!hasOwnProperty(ctx.data.attributes, idAttributes[i])) {
                continue;
            }

            if (ctx.data.attributes[idAttributes[i]] === ctx.data.identity.realmId) {
                return invertPolicyOutcome(true, ctx.options.invert);
            }
        }

        return invertPolicyOutcome(false, ctx.options.invert);
    }
}
