/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyData, definePolicyEvaluationContext } from '@authup/access';
import type { Result } from '@authup/kit';
import { EntityNotFoundError, normalizeError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { PolicyEngine } from '../../../security/policy/engine.ts';
import { buildPermissionCheckerData } from '../../permission/checker/data.ts';
import type {
    IPolicyCheckerService,
    PolicyCheckerServiceContext,
} from './types.ts';
import { findOneByIdOrNameKey } from '../../../entities/id-or-name.ts';

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
    ): Promise<void> {
        const input = await buildPermissionCheckerData(data, actor, this.ctx);

        await this.evaluate(idOrName, input, realm);
    }

    async safeCheck(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realm?: string,
    ): Promise<Result<null>> {
        // outside the try: being refused the subject answers the request, not the check
        const input = await buildPermissionCheckerData(data, actor, this.ctx);

        try {
            await this.evaluate(idOrName, input, realm);

            return { success: true, data: null };
        } catch (e) {
            return { success: false, error: normalizeError(e) };
        }
    }

    protected async evaluate(
        idOrName: string,
        input: Record<string, any>,
        realm: string | undefined,
    ): Promise<void> {
        const entity = await findOneByIdOrNameKey(idOrName, this.ctx.repository, async (key) => {
            const criteria: Record<string, any> = { ...key };

            if (realm && key.name) {
                const realmId = await this.ctx.realmRepository.resolveId(realm);

                if (!realmId) {
                    throw new EntityNotFoundError();
                }

                criteria.realmId = realmId;
            }

            return this.ctx.repository.findOneBy(criteria);
        });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        const engine = new PolicyEngine();

        await engine.evaluateOrFail(
            entity,
            definePolicyEvaluationContext({ data: new PolicyData(input) }),
        );
    }
}
