/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { PolicyData } from '@authup/permitus';
import type { Request } from 'routup';
import type { UserAttributeEntity } from '../../../../domains';
import { buildPolicyEvaluationDataByRequest, useRequestEnv } from '../../../request';

export async function canRequestManageUserAttribute(
    req: Request,
    entity: UserAttributeEntity,
    evaluationData?: PolicyData,
) : Promise<boolean> {
    const abilities = useRequestEnv(req, 'abilities');
    const userId = useRequestEnv(req, 'userId');

    if (!evaluationData) {
        evaluationData = buildPolicyEvaluationDataByRequest(req);
    }

    let canAbility : boolean = false;
    if (userId === entity.user_id) {
        canAbility = await abilities.safeCheck(
            PermissionName.USER_SELF_MANAGE,
            {
                ...evaluationData,
                attributes: entity,
            },
        );
    }

    if (!canAbility) {
        canAbility = await abilities.safeCheck(
            PermissionName.USER_UPDATE,
            {
                ...evaluationData,
                attributes: entity,
            },
        );
    }

    return canAbility;
}
