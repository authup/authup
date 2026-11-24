/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import { eq, inArray, not } from '@rapiq/core';
import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation/index.ts';
import { maybeInvertPolicyOutcome } from '../../helpers/index.ts';
import { PolicyIssueCode, definePolicyIssueItem } from '../../issue/index.ts';
import { BuiltInPolicyType } from '../constants.ts';
import { IdentityPolicyEvaluator } from '../identity/index.ts';
import { ClientMatchPolicyValidator } from './validator.ts';

export class ClientMatchPolicyEvaluator implements IPolicyEvaluator {
    protected validator : ClientMatchPolicyValidator;

    protected identityEvaluator: IdentityPolicyEvaluator;

    constructor() {
        this.validator = new ClientMatchPolicyValidator();
        this.identityEvaluator = new IdentityPolicyEvaluator();
    }

    requires() : string[] {
        // The owner key is not required: the pre-gate runs before the definition is loaded.
        return [BuiltInPolicyType.IDENTITY];
    }

    /**
     * Lowers only onto a column the caller named: a junction's `clientId` is the
     * receiving client, not the owner of the definition.
     */
    async toCondition(value: Record<string, any>, ctx: PolicyEvaluationContext) : Promise<ICondition | null> {
        if (typeof ctx.clientAttributeName !== 'string') {
            return null;
        }

        let policy;

        try {
            policy = await this.validator.run(value);
        } catch {
            return null;
        }

        const identity = await this.identityEvaluator.accessData(ctx);

        if (!identity) {
            return null;
        }

        const field = ctx.clientAttributeName;
        const clientId = identity.clientId ?? null;
        const condition = clientId === null ?
            inArray(field, []) :
            eq(field, clientId);

        return policy.invert ? not(condition) : condition;
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        const policy = await this.validator.run(value);

        const identity = await this.identityEvaluator.accessData(ctx);

        if (!identity) {
            return {
                success: false,
                unevaluable: true,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: 'The data property identity is missing',
                        path: ctx.path,
                    }),
                ],
            };
        }

        if (!ctx.data.has(BuiltInPolicyType.CLIENT_MATCH)) {
            if (ctx.preliminary) {
                return { success: false, pending: true };
            }

            if (ctx.withConditions) {
                const condition = await this.toCondition(value, ctx);

                return {
                    success: false,
                    pending: true,
                    ...(condition ? { condition, failCondition: not(condition) } : {}),
                };
            }

            // Fail closed: a call site that supplied no owner denies, and no
            // `invert` (here or on an ancestor) may turn that into a pass.
            return {
                success: false,
                unevaluable: true,
                issues: [
                    definePolicyIssueItem({
                        code: PolicyIssueCode.DATA_MISSING,
                        message: `The data property ${BuiltInPolicyType.CLIENT_MATCH} is missing`,
                        path: ctx.path,
                    }),
                ],
            };
        }

        const owner = ctx.data.get<string | null>(BuiltInPolicyType.CLIENT_MATCH) ?? null;
        const clientId = identity.clientId ?? null;

        return {
            success: maybeInvertPolicyOutcome(
                owner !== null && owner === clientId,
                policy.invert,
            ),
        };
    }
}
