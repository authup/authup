/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import type { Request } from 'routup';
import type { RoleAttributeEntity } from '@authup/server-database';
import { RoleEntity } from '@authup/server-database';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError, extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request/constants';

export async function runRoleAttributeValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RoleAttributeEntity>> {
    const result : ExpressValidationResult<RoleAttributeEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 255 })
            .run(req);

        await check('role_id')
            .exists()
            .isUUID();
    }

    await check('value')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

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

    if (operation === RequestHandlerOperation.CREATE) {
        result.data.realm_id = result.relation.role.realm_id;
        result.data.role_id = result.relation.role.id;
    }

    return result;
}
