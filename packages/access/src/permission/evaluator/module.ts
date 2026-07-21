/*
 * Copyright (c) 2021-2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import { or } from '@rapiq/core';
import { ErrorCode } from '@authup/errors';
import type { Issue } from 'validup';
import { defineIssueItem } from 'validup';
import { DecisionStrategy } from '@authup/kit';
import type { BasePolicy, CompositePolicy, IPolicyEngine } from '../../policy';
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

import type { PermissionPolicyBindingAggregated } from '../types.ts';
import type {
    IPermissionEvaluator,
    PermissionCompileContext,
    PermissionCompileResult,
    PermissionEvaluationContext,
    PermissionEvaluatorOptions,
} from './types.ts';

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
    ) : Promise<PermissionPolicyBindingAggregated | null> {
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

        const dataBase = ctx.data || new PolicyData();

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

            // The actor's grants for this permission form a disjunction: a single policy-free
            // grant is unrestricted, otherwise the permission passes iff ANY grant's policy
            // passes (AFFIRMATIVE). Each grant's policy already carries its own decisionStrategy
            // (a composite for multi-policy Layer-1 bindings, the raw policy for single).
            const grantPolicies = binding.grants
                .map((grant) => grant.policy)
                .filter((grantPolicy): grantPolicy is BasePolicy => !!grantPolicy);

            if (grantPolicies.length < binding.grants.length) {
                // some grant is policy-free => unrestricted
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return;
                }

                count++;

                continue;
            }

            const data = dataBase.clone();
            data.set(BuiltInPolicyType.PERMISSION_BINDING, binding);

            const compositePolicy : CompositePolicy = {
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                children: grantPolicies,
            };

            const evaluationResult = await this.policyEngine.evaluate(
                compositePolicy,
                definePolicyEvaluationContext({
                    include: options.policiesIncluded,
                    exclude: options.policiesExcluded,
                    data,
                }),
            );

            // A pending evaluation (missing data keys) is settled by the caller's
            // phase: the full evaluate denies (fail-closed default), the pre-gate
            // permits — the enriched-bag evaluate is the backstop.
            const passed = evaluationResult.success || (
                options.pendingPolicies === 'permit' &&
                !!evaluationResult.pending
            );

            if (passed) {
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
        // The pre-gate is DERIVED from data availability (issue #3286): policies whose
        // required data keys are absent from the bag stay pending and are permitted —
        // only a tree that settles false with the current bag denies. This replaces the
        // former hand-maintained type exclusion list (ATTRIBUTES / ATTRIBUTE_NAMES /
        // REALM_MATCH), whose mask-to-true encoding broke under `invert`.
        return this.evaluate({
            ...ctx,
            options: {
                ...(ctx.options || {}),
                pendingPolicies: 'permit',
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

    // ----------------------------------------------

    /**
     * Compile the permission's policy trees against the knowns bag into a
     * {@link PermissionCompileResult} — the query-build counterpart of
     * {@link evaluate} (issue #3286 phase 3). Runs the SAME evaluation walk with
     * `withConditions` enabled: policies that settle with the knowns settle here,
     * pending subtrees contribute their exact condition form. Multiple names are
     * a disjunction (any-of), so a single non-expressible name degrades the whole
     * compilation to `post` — pushing only some disjuncts would wrongly exclude
     * rows another name would admit.
     */
    async compile(ctx: PermissionCompileContext) : Promise<PermissionCompileResult> {
        const names = Array.isArray(ctx.name) ? ctx.name : [ctx.name];

        const dataBase = ctx.data || new PolicyData();

        const conditions : ICondition[] = [];
        let post = false;

        for (const name of names) {
            const binding = await this.findOne(name, {
                realmId: ctx.realmId,
                clientId: ctx.clientId,
            });
            if (!binding) {
                // unresolvable permission — a settled-false disjunct, drops out
                continue;
            }

            const grantPolicies = binding.grants
                .map((grant) => grant.policy)
                .filter((grantPolicy): grantPolicy is BasePolicy => !!grantPolicy);

            if (grantPolicies.length < binding.grants.length) {
                // some grant is policy-free => unrestricted
                return { verdict: 'allow' };
            }

            const data = dataBase.clone();
            data.set(BuiltInPolicyType.PERMISSION_BINDING, binding);

            const compositePolicy : CompositePolicy = {
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                children: grantPolicies,
            };

            const evaluationResult = await this.policyEngine.evaluate(
                compositePolicy,
                definePolicyEvaluationContext({
                    data,
                    withConditions: true,
                }),
            );

            if (evaluationResult.success) {
                return { verdict: 'allow' };
            }

            if (evaluationResult.pending) {
                if (evaluationResult.condition) {
                    conditions.push(evaluationResult.condition);
                } else {
                    post = true;
                }
            }
            // settled false — the disjunct drops out
        }

        if (post) {
            return { verdict: 'post' };
        }

        if (conditions.length === 0) {
            return { verdict: 'deny' };
        }

        if (conditions.length === 1) {
            const [condition] = conditions;
            return { verdict: 'conditional', condition: condition! };
        }

        return { verdict: 'conditional', condition: or(...conditions) };
    }
}
