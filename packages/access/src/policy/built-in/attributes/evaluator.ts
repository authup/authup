/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import { isFilter, isFilters } from '@rapiq/core';
import type { Predicate } from '@rapiq/memory';
import { compileFilters } from '@rapiq/memory';
import { MongoFiltersParser } from '@rapiq/parser-mongo';
import { isObject } from '@authup/kit';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue';
import { BuiltInPolicyType } from '../constants.ts';
import { AttributesPolicyValidator } from './validator';

/**
 * Collect every leaf filter field of a condition tree. The rapiq memory
 * backend compares string equality case-insensitively by default; pinning
 * all referenced fields keeps policy decisions byte-exact (the semantics
 * the previous @ucast/mongo2js evaluator enforced).
 */
function collectConditionFields(
    condition: ICondition,
    output: Set<string> = new Set(),
) : string[] {
    if (isFilters(condition)) {
        for (const child of condition.value) {
            collectConditionFields(child, output);
        }
    } else if (isFilter(condition)) {
        output.add(condition.field);
    }

    return [...output];
}

export class AttributesPolicyEvaluator<
    T extends Record<string, any> = Record<string, any>,
> implements IPolicyEvaluator {
    protected validator : AttributesPolicyValidator<T>;

    protected parser : MongoFiltersParser;

    constructor() {
        this.validator = new AttributesPolicyValidator<T>();
        this.parser = new MongoFiltersParser();
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

        let testIt : Predicate;

        try {
            const condition = this.parser.parse(policy.query);

            testIt = compileFilters(condition, { caseSensitive: collectConditionFields(condition) });
        } catch (e) {
            return {
                success: false,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.FIELD_INVALID,
                        message: e instanceof Error ?
                            e.message :
                            'The query could not be parsed.',
                        path: ctx.path,
                    }),
                ],
            };
        }

        return { success: maybeInvertPolicyOutcome(testIt(data), policy.invert) };
    }

    protected fixQuery(
        query: unknown | unknown[],
    ) {
        if (Array.isArray(query)) {
            for (const element of query) {
                this.fixQuery(element);
            }

            return;
        }

        if (isObject(query)) {
            const keys = Object.keys(query);
            for (const key of keys) {
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
                    if (fragments && fragments[1] !== undefined) {
                        query[key] = new RegExp(fragments[1], fragments[2] || '');
                    }
                }
            }
        }
    }
}
