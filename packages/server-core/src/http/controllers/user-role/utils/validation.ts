/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import type { Request } from 'routup';
import type { UserRoleEntity } from '../../../../domains';
import { RoleEntity, UserEntity } from '../../../../domains';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

export async function runUserRoleValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<UserRoleEntity>> {
    const result : ExpressValidationResult<UserRoleEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('user_id')
            .exists()
            .isUUID()
            .run(req);

        await check('role_id')
            .exists()
            .isUUID()
            .run(req);
    }

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RoleEntity, {
        id: 'role_id',
        entity: 'role',
    });

    await extendExpressValidationResultWithRelation(result, UserEntity, {
        id: 'user_id',
        entity: 'user',
    });

    // ----------------------------------------------

    return result;
}
