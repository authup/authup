/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { ExpressRequest } from '../../../type';
import {
    ExpressValidationError,
    ExpressValidationResult, extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../express-validation';
import { RoleAttributeEntity, RoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function runRoleAttributeValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RoleAttributeEntity>> {
    const result : ExpressValidationResult<RoleAttributeEntity> = initExpressValidationResult();

    if (operation === CRUDOperation.CREATE) {
        await check('name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 255 })
            .run(req);

        await check('role_id')
            .exists()
            .isUUID()
            .optional();
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
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RoleEntity, {
        id: 'role_id',
        entity: 'role',
    });

    if (operation === CRUDOperation.CREATE) {
        if (result.relation.role) {
            result.data.realm_id = result.relation.role.realm_id;
            result.data.role_id = result.relation.role.id;
        } else {
            result.data.realm_id = req.realmId;
            result.data.role_id = req.userId;
        }
    }

    return result;
}
