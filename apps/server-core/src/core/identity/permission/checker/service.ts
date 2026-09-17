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
        subject?: unknown,
    ): Promise<void> {
        const identity = await resolveCheckSubject(subject, actor, this.ctx.identityResolver);

        await this.evaluate(idOrName, data, actor, realm, identity);
    }

    async safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
        subject?: unknown,
    ): Promise<Result<null>> {
        // outside the try: being refused the subject answers the request, not the check
        const identity = await resolveCheckSubject(subject, actor, this.ctx.identityResolver);

        try {
            await this.evaluate(idOrName, data, actor, realm, identity);
            return { success: true, data: null };
        } catch (e) {
            return { success: false, error: normalizeError(e) };
        }
    }

    protected async evaluate(
        idOrName: string,
        data: Record<string, any>,
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

        const input = { ...data };
        // Surface the resource realm to the realm_scope reach factor (realm-match scope mode).
        // Only when the body carries an ATTRIBUTES realm — so a realm-less check still rides
        // the preEvaluate path below and neutral-passes.
        const attributes = input[BuiltInPolicyType.ATTRIBUTES] as Record<string, any> | undefined;
        if (attributes && hasOwnProperty(attributes, 'realmId')) {
            input[BuiltInPolicyType.REALM_MATCH] = attributes.realmId ?? null;
        }

        // Asked about the caller, the actor's evaluator owns the identity key: on a
        // request it asserts the caller's own identity when the scopes include
        // `global` and removes it otherwise. Asked about a subject that passed the
        // gate, the subject's identity is evaluated as stored (#3604).
        let evaluator = actor.permissionEvaluator;
        if (identity) {
            input[BuiltInPolicyType.IDENTITY] = identity;
            evaluator = new PermissionEvaluator({
                provider: this.ctx.permissionProvider,
                policyEngine: new PolicyEngine(this.ctx.identityPermissionProvider),
            });
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
