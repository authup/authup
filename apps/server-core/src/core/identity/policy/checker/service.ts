/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '@authup/access';
import { definePolicyEvaluationContext } from '@authup/access';
import type { Result } from '@authup/kit';
import { isUUID } from '@authup/kit';
import { EntityNotFoundError, normalizeError } from '@authup/errors';
import { PolicyEngine } from '../../../security/policy/engine.ts';
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
        data: PolicyData,
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

        const engine = new PolicyEngine(this.ctx.identityPermissionProvider);
        await engine.evaluateOrFail(
            entity,
            definePolicyEvaluationContext({ data }),
        );
    }

    async safeCheck(
        idOrName: string,
        data: PolicyData,
        realm?: string,
    ): Promise<Result<null>> {
        try {
            await this.check(idOrName, data, realm);
            return { success: true, data: null };
        } catch (e) {
            return { success: false, error: normalizeError(e) };
        }
    }
}
