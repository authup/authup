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
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { AttributesPolicy } from './types';
import { AttributesPolicyValidator } from './validator';

export class AttributesPolicyEvaluator<
    T extends Record<string, any> = Record<string, any>,
> implements PolicyEvaluator<AttributesPolicy<T>> {
    protected validator : AttributesPolicyValidator<T>;

    constructor() {
        this.validator = new AttributesPolicyValidator<T>();
    }

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.ATTRIBUTES;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean> {
        if (!isObject(ctx.data.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<AttributesPolicy<T>>): Promise<boolean> {
        if (!ctx.data.attributes) {
            throw PolicyError.evaluatorContextInvalid();
        }

        this.fixQuery(ctx.policy.query);

        const testIt = guard<T>(ctx.policy.query);
        return maybeInvertPolicyOutcome(testIt(ctx.data.attributes as T), ctx.policy.invert);
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
