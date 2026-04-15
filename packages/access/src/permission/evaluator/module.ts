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
import type { CompositePolicy, IPolicyEngine } from '../../policy';
import {
    BuiltInPolicyType,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyEngine,
    definePolicyEvaluationContext,
    definePolicyIssueGroup,
} from '../../policy';
import { PermissionError } from '../error';
import type { IPermissionProvider } from '../provider';

import type { PermissionPolicyBinding } from '../types.ts';
import type { IPermissionEvaluator, PermissionEvaluationContext, PermissionEvaluatorOptions } from './types.ts';

export class PermissionEvaluator implements IPermissionEvaluator {
    protected provider : IPermissionProvider;

    protected policyEngine : IPolicyEngine;

    protected clientId?: string | null;

    protected realmId?: string | null;

    // ----------------------------------------------

    constructor(options: PermissionEvaluatorOptions) {
        this.provider = options.provider;

        this.clientId = options.clientId || null;
        this.realmId = options.realmId || null;

        if (options.policyEngine) {
            this.policyEngine = options.policyEngine;
        } else {
            this.policyEngine = new PolicyEngine(PolicyDefaultEvaluators);
        }
    }

    // ----------------------------------------------

    protected async findOne(
        input: string,
        overrides: {
            realmId?: string | null,
            clientId?: string | null
        } = {},
    ) : Promise<PermissionPolicyBinding | null> {
        return this.provider.findOne({
            name: input,
            clientId: overrides.clientId ?? this.clientId,
            realmId: overrides.realmId ?? this.realmId,
        });
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

        const { options = {} } = ctx;

        const decisionStrategy = options.decisionStrategy ??
            DecisionStrategy.UNANIMOUS;

        const issues : Issue[] = [];

        let count = 0;

        const dataBase = ctx.input || new PolicyData();

        for (const name of ctx.name) {
            const binding = await this.findOne(name, {
                realmId: ctx.realmId,
                clientId: ctx.clientId,
            });
            if (!binding) {
                issues.push(defineIssueItem({
                    code: ErrorCode.PERMISSION_NOT_FOUND,
                    message: `The ${name} permission could not be resolved`,
                    path: [name],
                }));

                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    const error = PermissionError.evaluationFailed(ctx.name);
                    error.addIssues(issues);
                    throw error;
                }

                continue;
            }

            const policies = binding.policies ?? [];
            if (policies.length === 0) {
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;

                continue;
            }

            const data = dataBase.clone();
            data.set(BuiltInPolicyType.PERMISSION_BINDING, binding);

            const policyDecisionStrategy = binding.permission.decision_strategy ??
                DecisionStrategy.UNANIMOUS;

            const compositePolicy : CompositePolicy = {
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
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
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

                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
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
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
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
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
            },
        });
    }
}
