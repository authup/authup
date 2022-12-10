/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionID, isRealmResourceWritable } from '@authup/common';
import { Request } from 'routup';
import { PermissionEntity, RobotEntity, RobotPermissionEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildHTTPValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { CRUDOperation } from '../../../constants';

export async function runRobotPermissionValidation(
    req: Request,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RobotPermissionEntity>> {
    const result : ExpressValidationResult<RobotPermissionEntity> = initExpressValidationResult();

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
        throw new RequestValidationError(validation);
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

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(result.data.permission_id)) {
        throw new ForbiddenError('It is only allowed to assign permissions, which are also owned.');
    }

    const permissionTarget = ability
        .getTarget(PermissionID.ROBOT_PERMISSION_ADD);

    if (permissionTarget) {
        result.data.target = permissionTarget;
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RobotEntity, {
        id: 'robot_id',
        entity: 'robot',
    });

    if (result.relation.robot) {
        if (
            !isRealmResourceWritable(useRequestEnv(req, 'realmId'), result.relation.robot.realm_id)
        ) {
            throw new BadRequestError(buildHTTPValidationErrorMessage('robot_id'));
        }

        result.data.robot_realm_id = result.relation.robot.realm_id;
    }

    // ----------------------------------------------

    return result;
}
