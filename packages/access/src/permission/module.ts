/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../constants';
import { BuiltInPolicyType, PolicyEngine, PolicyError } from '../policy';
import { PermissionError } from './error';
import type { PermissionGetOptions, PermissionProvider } from './provider';
import { PermissionMemoryProvider } from './provider';

import type {
    PermissionCheckerCheckContext, PermissionCheckerOptions, PermissionItem,
} from './types';

export class PermissionChecker {
    protected provider : PermissionProvider;

    protected policyEngine : PolicyEngine;

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
            this.policyEngine = new PolicyEngine();
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

        let lastError : PermissionError | undefined;
        let count = 0;

        for (let i = 0; i < ctx.name.length; i++) {
            const entity = await this.get(ctx.name[i]);
            if (!entity) {
                lastError = PermissionError.notFound(ctx.name[i]);
                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    throw lastError;
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

            let outcome : boolean;

            try {
                outcome = await this.policyEngine.evaluate({
                    data: {
                        ...ctx.data || {},
                        permission: entity,
                    },
                    spec: entity.policy,
                    options: {
                        include: options.policiesIncluded,
                        exclude: options.policiesExcluded,
                    },
                });
            } catch (e) {
                if (e instanceof PolicyError) {
                    lastError = PermissionError.evaluationFailed({
                        name: entity.name,
                        policy: entity.policy,
                        policyError: e,
                    });
                } else {
                    lastError = PermissionError.evaluationFailed({
                        name: entity.name,
                        policy: entity.policy,
                    });
                }

                outcome = false;
            }

            if (outcome) {
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;
            } else {
                if (!lastError) {
                    lastError = PermissionError.evaluationFailed({
                        name: entity.name,
                        policy: entity.policy,
                    });
                }

                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    throw lastError;
                }

                count--;
            }
        }

        if (count > 0) {
            return;
        }

        if (count > 1 || !lastError) {
            throw PermissionError.deniedAll(ctx.name);
        } else {
            throw lastError;
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
