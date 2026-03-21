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
import type { IPermissionRepository, PermissionGetOptions } from '../repository';
import { PermissionMemoryRepository } from '../repository';

import type {
    PermissionItem,
} from '../types.ts';
import type { IPermissionChecker, PermissionCheckerCheckContext, PermissionCheckerOptions } from './types.ts';

export class PermissionChecker implements IPermissionChecker {
    protected provider : IPermissionRepository;

    protected policyEngine : IPolicyEngine;

    protected client_id?: string | null;

    protected realm_id?: string | null;

    // ----------------------------------------------

    constructor(options: PermissionCheckerOptions = {}) {
        if (options.repository) {
            this.provider = options.repository;
        } else {
            this.provider = new PermissionMemoryRepository();
        }

        if (options.client_id) {
            this.client_id = options.client_id;
        }

        if (options.realm_id) {
            this.realm_id = options.realm_id;
        }

        if (options.policyEngine) {
            this.policyEngine = options.policyEngine;
        } else {
            this.policyEngine = new PolicyEngine(PolicyDefaultEvaluators);
        }
    }

    // ----------------------------------------------

    /**
     * Get a permission.
     *
     * @param input
     */
    protected async findOne(input: string) : Promise<PermissionItem | null> {
        const options : PermissionGetOptions = {
            name: input,
        };

        if (this.client_id) {
            options.client_id = this.client_id;
        }

        if (this.realm_id) {
            options.realm_id = this.realm_id;
        }

        return this.provider.findOne(options);
    }

    // ----------------------------------------------

    /**
     * Verify if one or more possible owned permissions satisfy their conditions.
     *
     * @throws PermissionError
     *
     * @param ctx
     */
    async check(ctx: PermissionCheckerCheckContext) : Promise<void> {
        if (!Array.isArray(ctx.name)) {
            await this.check({
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
            const entity = await this.findOne(ctx.name[i]);
            if (!entity) {
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

            const policies = entity.policies ?? [];
            if (policies.length === 0) {
                if (decision_strategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;

                continue;
            }

            const data = dataBase.clone();
            data.set(BuiltInPolicyType.PERMISSION_BINDING, entity);

            const policyDecisionStrategy = entity.decision_strategy ??
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
                    message: `The ${entity.name} permissions policy evaluation failed`,
                    path: [entity.name],
                }));

                if (decision_strategy === DecisionStrategy.UNANIMOUS) {
                    const error = PermissionError.evaluationFailed(entity.name);
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

    /**
     * Verify if one of the permissions evaluates to true.
     *
     * @throws PermissionError
     *
     * @param ctx
     */
    async checkOneOf(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.check({
            ...ctx,
            options: {
                ...(ctx.options || {}),
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
        });
    }

    // ----------------------------------------------

    async preCheck(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.check({
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

    async preCheckOneOf(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.preCheck({
            ...ctx,
            options: {
                ...(ctx.options || {}),
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
        });
    }
}
