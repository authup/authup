/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { guard } from '@ucast/mongo2js';
import { isObject } from '@authup/kit';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { BuiltInPolicyType } from '../constants.ts';
import { AttributesPolicyValidator } from './validator';

export class AttributesPolicyEvaluator<
    T extends Record<string, any> = Record<string, any>,
> implements IPolicyEvaluator {
    protected validator : AttributesPolicyValidator<T>;

    constructor() {
        this.validator = new AttributesPolicyValidator<T>();
    }

    async accessData(ctx: PolicyEvaluationContext) : Promise<T | null> {
        if (!ctx.data.has(BuiltInPolicyType.ATTRIBUTES)) {
            return null;
        }

        if (ctx.data.isValidated(BuiltInPolicyType.ATTRIBUTES)) {
            return ctx.data.get<T>(BuiltInPolicyType.ATTRIBUTES);
        }

        // todo: run validator on attributes (isObject ...)
        const data = ctx.data.get<T>(BuiltInPolicyType.ATTRIBUTES);

        ctx.data.set(BuiltInPolicyType.ATTRIBUTES, data);
        ctx.data.setValidated(BuiltInPolicyType.ATTRIBUTES);

        return data;
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        const data = await this.accessData(ctx);
        if (!data) {
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

        this.fixQuery(policy.query);

        const testIt = guard<T>(policy.query);

        return {
            success: maybeInvertPolicyOutcome(testIt(data as T), policy.invert),
        };
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
