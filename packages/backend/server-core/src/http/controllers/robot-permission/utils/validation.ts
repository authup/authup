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
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { extendExpressValidationResultWithRobot } from '../../robot';
import { extendExpressValidationResultWithPermission } from '../../permission';
import { RobotPermissionValidationResult } from '../type';
import { CRUDOperation } from '../../../constants';

export async function runRobotPermissionValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<RobotPermissionValidationResult> {
    const result : RobotPermissionValidationResult = {
        data: {},
        meta: {},
    };
    if (operation === CRUDOperation.CREATE) {
        await check('robot_id')
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
    if (result.meta.permission.target) {
        result.data.target = result.meta.permission.target;
    }

    const permissionTarget = req.ability.getTarget(PermissionID.ROBOT_PERMISSION_ADD);
    if (permissionTarget) {
        result.data.target = permissionTarget;
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRobot(result);
    if (result.meta.robot) {
        if (
            !isPermittedForResourceRealm(req.realmId, result.meta.robot.realm_id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('robot_id'));
        }

        result.data.robot_realm_id = result.meta.robot.realm_id;
    }

    // ----------------------------------------------

    return result;
}
