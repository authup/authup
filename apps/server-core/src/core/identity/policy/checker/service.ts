/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData, definePolicyEvaluationContext } from '@authup/access';
import { isUUID } from '@authup/kit';
import { EntityNotFoundError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { PolicyEngine } from '../../../security/policy/engine.ts';
import { toIdentityPolicyData } from '../../permission/identity-policy-data.ts';
import type {
    IPolicyCheckerService,
    PolicyCheckResult,
    PolicyCheckerServiceContext,
} from './types.ts';

export class PolicyCheckerService implements IPolicyCheckerService {
    protected ctx: PolicyCheckerServiceContext;

    constructor(ctx: PolicyCheckerServiceContext) {
        this.ctx = ctx;
    }

    async check(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<PolicyCheckResult> {
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
        if (
            !input[BuiltInPolicyType.IDENTITY] &&
            input[BuiltInPolicyType.IDENTITY] !== null
        ) {
            input[BuiltInPolicyType.IDENTITY] = toIdentityPolicyData(actor.identity);
        }

        const engine = new PolicyEngine(this.ctx.identityPermissionProvider);

        try {
            await engine.evaluate(entity, definePolicyEvaluationContext({ data: new PolicyData(input) }));

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
