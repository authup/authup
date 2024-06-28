/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { guard } from '@ucast/mongo2js';
import { isObject } from '../../../utils';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { invertPolicyOutcome } from '../../utils';
import { isAttributesPolicy } from './helper';
import type { AttributesPolicyOptions } from './types';

export class AttributesPolicyEvaluator<
    T extends Record<string, any> = Record<string, any>,
> implements PolicyEvaluator<AttributesPolicyOptions<T>> {
    verify(
        ctx: PolicyEvaluatorContext<any, any>,
    ): ctx is PolicyEvaluatorContext<AttributesPolicyOptions<T>> {
        return isAttributesPolicy(ctx.options);
    }

    execute(ctx: PolicyEvaluatorContext<AttributesPolicyOptions<T>>): boolean {
        if (!isObject(ctx.data) || !isObject(ctx.data.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const testIt = guard(ctx.options.query);
        return invertPolicyOutcome(testIt(ctx.data.attributes), ctx.options.invert);
    }
}
