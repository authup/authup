/*
 * Copyright (c) 2021-2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { Issue } from 'validup';
import { defineIssueItem } from 'validup';
import { DecisionStrategy } from '../../constants.ts';
import type { CompositePolicy, IPolicyEngine, PolicyWithType } from '../../policy';
import {
    BuiltInPolicyType,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyEngine,
    definePolicyEvaluationContext,
    definePolicyIssueGroup,
} from '../../policy';
import { PermissionError } from '../error';
import type { IPermissionProvider, PermissionGetOptions } from '../repository';
import { PermissionMemoryProvider } from '../repository';

import type {
    PermissionBinding,
} from '../types.ts';
import type { IPermissionEvaluator, PermissionEvaluationContext, PermissionEvaluatorOptions } from './types.ts';

export class PermissionEvaluator implements IPermissionEvaluator {
    protected provider : IPermissionProvider;

    protected policyEngine : IPolicyEngine;

    protected client_id?: string | null;

    protected realm_id?: string | null;

    // ----------------------------------------------

    constructor(options: PermissionEvaluatorOptions = {}) {
        if (options.repository) {
            this.provider = options.repository;
        } else {
            this.provider = new PermissionMemoryProvider();
        }

        if (typeof options.client_id !== 'undefined') {
            this.client_id = options.client_id;
        }

        if (typeof options.realm_id !== 'undefined') {
            this.realm_id = options.realm_id;
        }

        if (options.policyEngine) {
            this.policyEngine = options.policyEngine;
        } else {
            this.policyEngine = new PolicyEngine(PolicyDefaultEvaluators);
        }
    }

    // ----------------------------------------------

    protected async findOne(input: string) : Promise<PermissionBinding | null> {
        const options : PermissionGetOptions = {
            name: input,
        };

        if (typeof this.client_id !== 'undefined') {
            options.client_id = this.client_id;
        }

        if (typeof this.realm_id !== 'undefined') {
            options.realm_id = this.realm_id;
        }

        return this.provider.findOne(options);
    }

    // ----------------------------------------------

    async evaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        if (!Array.isArray(ctx.name)) {
            await this.evaluate({
                ...ctx,
                name: [ctx.name],
            });
            return;
        }

        const {
            options = {},
        } = ctx;

        const decision_strategy = options.decision_strategy ??
            DecisionStrategy.UNANIMOUS;

        const issues : Issue[] = [];

        let count = 0;

        const dataBase = ctx.input || new PolicyData();

        for (let i = 0; i < ctx.name.length; i++) {
            const binding = await this.findOne(ctx.name[i]);
            if (!binding) {
                issues.push(defineIssueItem({
                    code: ErrorCode.PERMISSION_NOT_FOUND,
                    message: `The ${ctx.name[i]} permission could not be resolved`,
                    path: [ctx.name[i]],
                }));

                if (decision_strategy === DecisionStrategy.UNANIMOUS) {
                    const error = PermissionError.evaluationFailed(ctx.name);
                    error.addIssues(issues);
                    throw error;
                }

                continue;
            }

            const policies = binding.policies ?? [];
            if (policies.length === 0) {
                if (decision_strategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;

                continue;
            }

            const data = dataBase.clone();
            data.set(BuiltInPolicyType.PERMISSION_BINDING, binding);

            const policyDecisionStrategy = (binding.permission.decision_strategy as `${DecisionStrategy}` | undefined | null) ??
                DecisionStrategy.UNANIMOUS;

            const compositePolicy : PolicyWithType<CompositePolicy> = {
                type: BuiltInPolicyType.COMPOSITE,
                decision_strategy: policyDecisionStrategy,
                children: policies,
            };

            const evaluationResult = await this.policyEngine.evaluate(
                compositePolicy,
                definePolicyEvaluationContext({
                    include: options.policiesIncluded,
                    exclude: options.policiesExcluded,
                    data,
                }),
            );

            if (evaluationResult.success) {
                if (decision_strategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;
            } else {
                issues.push(definePolicyIssueGroup({
                    code: ErrorCode.PERMISSION_EVALUATION_FAILED,
                    issues: evaluationResult.issues || [],
                    message: `The ${binding.permission.name} permissions policy evaluation failed`,
                    path: [binding.permission.name],
                }));

                if (decision_strategy === DecisionStrategy.UNANIMOUS) {
                    const error = PermissionError.evaluationFailed(binding.permission.name);
                    error.addIssues(issues);
                    throw error;
                }

                count--;
            }
        }

        if (count > 0) {
            return;
        }

        if (issues.length === 0) {
            throw PermissionError.deniedAll(ctx.name);
        } else {
            const error = PermissionError.evaluationFailed(ctx.name);
            error.addIssues(issues);
            throw error;
        }
    }

    async evaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluate({
            ...ctx,
            options: {
                ...(ctx.options || {}),
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
        });
    }

    // ----------------------------------------------

    async preEvaluate(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.evaluate({
            ...ctx,
            options: {
                ...(ctx.options || {}),
                policiesExcluded: [
                    BuiltInPolicyType.ATTRIBUTES,
                    BuiltInPolicyType.ATTRIBUTE_NAMES,
                    BuiltInPolicyType.REALM_MATCH,
                ],
            },
        });
    }

    async preEvaluateOneOf(ctx: PermissionEvaluationContext) : Promise<void> {
        return this.preEvaluate({
            ...ctx,
            options: {
                ...(ctx.options || {}),
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
        });
    }
}
