/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest } from '../../../type';
import { RolePermissionValidationResult } from '../type';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { extendExpressValidationResultWithRole } from '../../role';
import { extendExpressValidationResultWithPermission } from '../../permission';
import { CRUDOperation } from '../../../constants';

export async function runRolePermissionValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<RolePermissionValidationResult> {
    const result : RolePermissionValidationResult = {
        data: {},
        meta: {},
    };

    if (operation === CRUDOperation.CREATE) {
        await check('role_id')
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

    await extendExpressValidationResultWithPermission(result);
    if (result.meta.permission) {
        result.data.target = result.meta.permission.target;
    }

    const ownedPermission = req.ability.findPermission(PermissionID.ROLE_PERMISSION_ADD);
    if (ownedPermission.target) {
        result.data.target = ownedPermission.target;
    }

    await extendExpressValidationResultWithRole(result);
    if (result.meta.role) {
        if (!isPermittedForResourceRealm(req.realmId, result.meta.role.realm_id)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.meta.role.realm_id;
    }

    // ----------------------------------------------

    return result;
}
