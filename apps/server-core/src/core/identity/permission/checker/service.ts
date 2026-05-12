/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType, PermissionEvaluator, PolicyData } from '@authup/access';
import { isUUID } from '@authup/kit';
import { EntityNotFoundError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { PolicyEngine } from '../../../security/policy/engine.ts';
import { toIdentityPolicyData } from '../identity-policy-data.ts';
import type {
    IPermissionCheckerService,
    PermissionCheckResult,
    PermissionCheckerServiceContext,
} from './types.ts';

export class PermissionCheckerService implements IPermissionCheckerService {
    protected ctx: PermissionCheckerServiceContext;

    constructor(ctx: PermissionCheckerServiceContext) {
        this.ctx = ctx;
    }

    async check(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<PermissionCheckResult> {
        let criteria: Record<string, any>;
        if (isUUID(idOrName)) {
            criteria = { id: idOrName };
        } else {
            const realmEntity = await this.ctx.realmRepository.resolve(realm);
            criteria = {
                name: idOrName,
                ...(realmEntity ? { realm_id: realmEntity.id } : {}),
            };
        }

        const entity = await this.ctx.repository.findOneBy(criteria);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const input = { ...data };
        if (typeof input[BuiltInPolicyType.IDENTITY] === 'undefined') {
            input[BuiltInPolicyType.IDENTITY] = toIdentityPolicyData(actor.identity);
        }

        const evaluationContext: PermissionEvaluationContext = {
            name: entity.name,
            input: new PolicyData(input),
        };

        const evaluator = new PermissionEvaluator({
            provider: this.ctx.permissionProvider,
            policyEngine: new PolicyEngine(this.ctx.identityPermissionProvider),
        });

        try {
            if (
                evaluationContext.input &&
                evaluationContext.input.has(BuiltInPolicyType.ATTRIBUTES)
            ) {
                await evaluator.evaluate(evaluationContext);
            } else {
                await evaluator.preEvaluate(evaluationContext);
            }

            return { status: 'success' };
        } catch (e) {
            return {
                status: 'error',
                data: serializeError(e),
            };
        }
    }
}

function serializeError(e: unknown): Record<string, any> {
    if (e instanceof Error) {
        return {
            name: e.name,
            message: e.message,
        };
    }
    if (typeof e === 'string') {
        return { message: e };
    }
    return { message: String(e) };
}
