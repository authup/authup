/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType, PermissionEvaluator, definePolicyData } from '@authup/access';
import type { Result } from '@authup/kit';
import { hasOwnProperty, isUUID } from '@authup/kit';
import { EntityNotFoundError, normalizeError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { PolicyEngine } from '../../../security/policy/engine.ts';
import { toIdentityPolicyData } from '../identity-policy-data.ts';
import type {
    IPermissionCheckerService,
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
    ): Promise<void> {
        let criteria: Record<string, any>;
        if (isUUID(idOrName)) {
            criteria = { id: idOrName };
        } else {
            criteria = { name: idOrName };

            if (realm) {
                const realmId = await this.ctx.realmRepository.resolveId(realm);
                if (!realmId) {
                    throw new EntityNotFoundError();
                }
                criteria.realmId = realmId;
            }
        }

        const entity = await this.ctx.repository.findOneBy(criteria);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const input = { ...data };
        if (typeof input[BuiltInPolicyType.IDENTITY] === 'undefined') {
            input[BuiltInPolicyType.IDENTITY] = toIdentityPolicyData(actor.identity);
        }
        // Surface the resource realm to the realm_scope reach factor (realm-match scope mode).
        // Only when the body carries an ATTRIBUTES realm — so a realm-less check still rides
        // the preEvaluate path below and neutral-passes.
        const attributes = input[BuiltInPolicyType.ATTRIBUTES] as Record<string, any> | undefined;
        if (attributes && hasOwnProperty(attributes, 'realmId')) {
            input[BuiltInPolicyType.REALM_MATCH] = attributes.realmId ?? null;
        }

        const evaluationContext: PermissionEvaluationContext = {
            name: entity.name,
            data: definePolicyData(input),
        };

        const evaluator = new PermissionEvaluator({
            provider: this.ctx.permissionProvider,
            policyEngine: new PolicyEngine(this.ctx.identityPermissionProvider),
        });

        if (
            evaluationContext.data &&
            evaluationContext.data.has(BuiltInPolicyType.ATTRIBUTES)
        ) {
            await evaluator.evaluate(evaluationContext);
        } else {
            await evaluator.preEvaluate(evaluationContext);
        }
    }

    async safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<Result<null>> {
        try {
            await this.check(idOrName, data, actor, realm);
            return { success: true, data: null };
        } catch (e) {
            return { success: false, error: normalizeError(e) };
        }
    }
}
