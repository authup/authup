/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { guard } from '@ucast/mongo2js';
import { isObject } from '@authup/kit';
import { PolicyError } from '../../error';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyInput, PolicyWithType } from '../../types';
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

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.config.type === BuiltInPolicyType.ATTRIBUTES;
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<AttributesPolicy<T>> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<AttributesPolicy<T>>) : Promise<PolicyInput> {
        if (!isObject(ctx.input.attributes)) {
            throw PolicyError.evaluatorContextInvalid();
        }

        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<AttributesPolicy<T>>): Promise<boolean> {
        if (!ctx.input.attributes) {
            throw PolicyError.evaluatorContextInvalid();
        }

        this.fixQuery(ctx.config.query);

        const testIt = guard<T>(ctx.config.query);
        return maybeInvertPolicyOutcome(testIt(ctx.input.attributes as T), ctx.config.invert);
    }

    protected fixQuery(
        query: unknown | unknown[],
    ) {
        if (Array.isArray(query)) {
            for (let i = 0; i < query.length; i++) {
                this.fixQuery(query[i]);
            }

            return;
        }

        if (isObject(query)) {
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
}
