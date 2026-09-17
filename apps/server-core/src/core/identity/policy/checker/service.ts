/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData } from '@authup/access';
import { BuiltInPolicyType, PolicyData, definePolicyEvaluationContext } from '@authup/access';
import type { Result } from '@authup/kit';
import { isUUID } from '@authup/kit';
import { EntityNotFoundError, normalizeError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { PolicyEngine } from '../../../security/policy/engine.ts';
import { resolveCheckSubject } from '../../permission/checker/subject.ts';
import type {
    IPolicyCheckerService,
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
        caller?: IdentityPolicyData,
    ): Promise<void> {
        const input = { ...data };
        const identity = await resolveCheckSubject(input[BuiltInPolicyType.IDENTITY], actor, this.ctx.identityResolver);

        await this.evaluate(idOrName, input, realm, identity ?? caller);
    }

    async safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
        caller?: IdentityPolicyData,
    ): Promise<Result<null>> {
        const input = { ...data };
        // outside the try: being refused the subject answers the request, not the check
        const identity = await resolveCheckSubject(input[BuiltInPolicyType.IDENTITY], actor, this.ctx.identityResolver);

        try {
            await this.evaluate(idOrName, input, realm, identity ?? caller);
            return { success: true, data: null };
        } catch (e) {
            return { success: false, error: normalizeError(e) };
        }
    }

    protected async evaluate(
        idOrName: string,
        input: Record<string, any>,
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

        // the subject as stored, or the caller when the data names none
        if (identity) {
            input[BuiltInPolicyType.IDENTITY] = identity;
        }

        const engine = new PolicyEngine(this.ctx.identityPermissionProvider);
        await engine.evaluateOrFail(
            entity,
            definePolicyEvaluationContext({ data: new PolicyData(input) }),
        );
    }
}
