/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { guard } from '@ucast/mongo2js';
import { isObject } from 'smob';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../utils';
import { isAttributesPolicy } from './helper';
import type { AttributesPolicyOptions } from './types';

export class AttributesPolicyEvaluator<
    T extends Record<string, any> = Record<string, any>,
> implements PolicyEvaluator<AttributesPolicyOptions<T>> {
    async canEvaluate(
        ctx: PolicyEvaluatorContext<any, any>,
    ) : Promise<boolean> {
        return isAttributesPolicy(ctx.options);
    }

    async evaluate(ctx: PolicyEvaluatorContext<AttributesPolicyOptions<T>>): Promise<boolean> {
        if (!isObject(ctx.data) || !isObject(ctx.data.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        this.fixQuery(ctx.options.query);

        const testIt = guard<T>(ctx.options.query);
        return maybeInvertPolicyOutcome(testIt(ctx.data.attributes as T), ctx.options.invert);
    }

    protected fixQuery(query: Record<string, any>) {
        const keys = Object.keys(query);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = query[key];

            if (isObject(value) || Array.isArray(value)) {
                this.fixQuery(value);
                continue;
            }

            if (
                key === '$regex' &&
                typeof value === 'string'
            ) {
                const fragments = value.match(/\/(.*?)\/([a-z]*)?$/i);
                if (fragments) {
                    query[key] = new RegExp(fragments[1], fragments[2]);
                }
            }
        }
    }
}
