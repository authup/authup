/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest } from '../../../type';
import {
    ExpressValidationError,
    ExpressValidationResult,
    buildExpressValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../express-validation';
import { CRUDOperation } from '../../../constants';
import { PermissionEntity, UserEntity, UserPermissionEntity } from '../../../../domains';

export async function runUserPermissionValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<UserPermissionEntity>> {
    const result : ExpressValidationResult<UserPermissionEntity> = initExpressValidationResult();

    if (operation === CRUDOperation.CREATE) {
        await check('user_id')
            .exists()
            .isUUID()
            .run(req);

        await check('permission_id')
            .exists()
            .isString()
            .run(req);

        await check('target')
            .exists()
            .isString()
            .isLength({ min: 3, max: 16 })
            .optional({ nullable: true })
            .run(req);
    }

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, PermissionEntity, {
        id: 'permission_id',
        entity: 'permission',
    });

    if (result.relation.permission.target) {
        result.data.target = result.relation.permission.target;
    }

    const permissionTarget = req.ability.getTarget(PermissionID.USER_PERMISSION_ADD);
    if (permissionTarget) {
        result.data.target = permissionTarget;
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, UserEntity, {
        id: 'user_id',
        entity: 'user',
    });

    if (result.relation.user) {
        if (
            !isPermittedForResourceRealm(req.realmId, result.relation.user.realm_id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('user_id'));
        }

        result.data.user_realm_id = result.relation.user.realm_id;
    }

    // ----------------------------------------------

    return result;
}
