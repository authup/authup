/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { Issue } from 'validup';
import { defineIssueItem } from 'validup';
import { DecisionStrategy } from '../constants';
import type { IPolicyEngine } from '../policy';
import {
    BuiltInPolicyType,
    PolicyData,
    PolicyEngine,
    definePolicyEvaluationContext,
    definePolicyIssueGroup,
} from '../policy';
import { PermissionError } from './error';
import type { IPermissionProvider, PermissionGetOptions } from './provider';
import { PermissionMemoryProvider } from './provider';

import type {
    PermissionCheckerCheckContext, PermissionCheckerOptions, PermissionItem,
} from './types';
import { PolicyDefaultEvaluators } from '../policy/constants.ts';

export class PermissionChecker {
    protected provider : IPermissionProvider;

    protected policyEngine : IPolicyEngine;

    protected clientId?: string | null;

    protected realmId?: string | null;

    // ----------------------------------------------

    constructor(options: PermissionCheckerOptions = {}) {
        if (options.provider) {
            this.provider = options.provider;
        } else {
            this.provider = new PermissionMemoryProvider();
        }

        if (options.clientId) {
            this.clientId = options.clientId;
        }

        if (options.realmId) {
            this.realmId = options.realmId;
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
    protected async get(input: string) : Promise<PermissionItem | undefined> {
        const options : PermissionGetOptions = {
            name: input,
        };

        if (this.clientId) {
            options.clientId = this.clientId;
        }

        if (this.realmId) {
            options.realmId = this.realmId;
        }

        return this.provider.get(options);
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

        const decisionStrategy = options.decisionStrategy ??
            DecisionStrategy.UNANIMOUS;

        const issues : Issue[] = [];

        let count = 0;

        const dataBase = ctx.input || new PolicyData();

        for (let i = 0; i < ctx.name.length; i++) {
            const entity = await this.get(ctx.name[i]);
            if (!entity) {
                issues.push(defineIssueItem({
                    code: ErrorCode.PERMISSION_NOT_FOUND,
                    message: `The ${ctx.name[i]} permission could not be resolved`,
                    path: [ctx.name[i]],
                }));

                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    const error = PermissionError.evaluationFailed(ctx.name);
                    error.addIssues(issues);
                    throw error;
                }

                continue;
            }

            if (!entity.policy) {
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;

                continue;
            }

            const data = dataBase.clone();
            data.set(BuiltInPolicyType.PERMISSION_BINDING, entity);

            const evaluationResult = await this.policyEngine.evaluate(
                entity.policy,
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
                    message: `The ${entity.name} permissions policy evaluation failed`,
                    path: [entity.name],
                }));

                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
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
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
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
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
            },
        });
    }
}
