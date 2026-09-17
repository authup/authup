/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData, PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType, PermissionEvaluator, definePolicyData } from '@authup/access';
import type { Result } from '@authup/kit';
import { hasOwnProperty, isUUID } from '@authup/kit';
import { EntityNotFoundError, normalizeError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { PolicyEngine } from '../../../security/policy/engine.ts';
import { toIdentityPolicyData } from '../identity-policy-data.ts';
import { resolveCheckSubject } from './subject.ts';
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
        const input = { ...data };
        const identity = await resolveCheckSubject(input[BuiltInPolicyType.IDENTITY], actor, this.ctx.identityResolver);

        await this.evaluate(idOrName, input, actor, realm, identity);
    }

    async safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<Result<null>> {
        const input = { ...data };
        // outside the try: being refused the subject answers the request, not the check
        const identity = await resolveCheckSubject(input[BuiltInPolicyType.IDENTITY], actor, this.ctx.identityResolver);

        try {
            await this.evaluate(idOrName, input, actor, realm, identity);
            return { success: true, data: null };
        } catch (e) {
            return { success: false, error: normalizeError(e) };
        }
    }

    protected async evaluate(
        idOrName: string,
        input: Record<string, any>,
        actor: ActorContext,
        realm: string | undefined,
        identity: IdentityPolicyData | undefined,
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

        // Surface the resource realm to the realm_scope reach factor (realm-match scope mode).
        // Only when the body carries an ATTRIBUTES realm — so a realm-less check still rides
        // the preEvaluate path below and neutral-passes.
        const attributes = input[BuiltInPolicyType.ATTRIBUTES] as Record<string, any> | undefined;
        if (attributes && hasOwnProperty(attributes, 'realmId')) {
            input[BuiltInPolicyType.REALM_MATCH] = attributes.realmId ?? null;
        }

        // Asked about the actor (no identity in the data), its evaluator governs
        // the identity under the request's scopes. Asked about a subject that passed
        // the gate, the subject as stored runs on an evaluator that keeps it (#3604).
        let evaluator = actor.permissionEvaluator;
        if (identity) {
            input[BuiltInPolicyType.IDENTITY] = identity;
            evaluator = new PermissionEvaluator({
                provider: this.ctx.permissionProvider,
                policyEngine: new PolicyEngine(this.ctx.identityPermissionProvider),
            });
        } else {
            const own = toIdentityPolicyData(actor.identity);
            if (own) {
                input[BuiltInPolicyType.IDENTITY] = own;
            }
        }

        // the resolved row, not a global permission of the same name
        const evaluationContext: PermissionEvaluationContext = {
            name: entity.name,
            realmId: entity.realmId,
            clientId: entity.clientId,
            data: definePolicyData(input),
        };

        if (
            evaluationContext.data &&
            evaluationContext.data.has(BuiltInPolicyType.ATTRIBUTES)
        ) {
            await evaluator.evaluate(evaluationContext);
        } else {
            await evaluator.preEvaluate(evaluationContext);
        }
    }
}
