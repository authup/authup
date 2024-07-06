/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenObject, isObject } from '../../../utils';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { invertPolicyOutcome } from '../../utils';
import { isAttributeNamesPolicy } from './helper';
import type { AttributeNamesPolicyOptions } from './types';

export class AttributeNamesPolicyEvaluator implements PolicyEvaluator<AttributeNamesPolicyOptions> {
    async canEvaluate(
        ctx: PolicyEvaluatorContext<any, any>,
    ) : Promise<boolean> {
        return isAttributeNamesPolicy(ctx.options);
    }

    async evaluate(ctx: PolicyEvaluatorContext<AttributeNamesPolicyOptions>): Promise<boolean> {
        if (!isObject(ctx.data) || !isObject(ctx.data.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const attributes = flattenObject(ctx.data.attributes);
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            const index = ctx.options.names.indexOf(keys[i]);
            if (index === -1) {
                return invertPolicyOutcome(false, ctx.options.invert);
            }
        }

        return invertPolicyOutcome(true, ctx.options.invert);
    }
}
