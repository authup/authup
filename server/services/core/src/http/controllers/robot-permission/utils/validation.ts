/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import type { Request } from 'routup';
import type { RobotPermissionEntity } from '../../../../domains';
import { PermissionEntity, RobotEntity } from '../../../../domains';
import { isRequestSubOwner, useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request/constants';

export async function runRobotPermissionValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RobotPermissionEntity>> {
    const result : ExpressValidationResult<RobotPermissionEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('robot_id')
            .exists()
            .isUUID()
            .run(req);

        await check('permission_id')
            .exists()
            .isUUID()
            .run(req);

        await check('target')
            .exists()
            .isString()
            .isLength({ min: 3, max: 16 })
            .optional({ nullable: true })
            .run(req);
    }

    await check('condition')
        .exists()
        .isObject()
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    const ability = useRequestEnv(req, 'ability');

    await extendExpressValidationResultWithRelation(result, PermissionEntity, {
        id: 'permission_id',
        entity: 'permission',
    });

    if (result.relation.permission) {
        if (result.relation.permission.target) {
            result.data.target = result.relation.permission.target;
        }

        if (
            !isRequestSubOwner(req) &&
            !ability.has(result.relation.permission.name)
        ) {
            throw new ForbiddenError('It is only allowed to assign robot permissions, which are also owned.');
        }
    }

    const permission = ability
        .findOne(PermissionName.ROBOT_PERMISSION_ADD);

    if (permission) {
        result.data.target = permission.target;
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RobotEntity, {
        id: 'robot_id',
        entity: 'robot',
    });

    if (result.relation.robot) {
        if (
            !isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.robot.realm_id)
        ) {
            throw new BadRequestError(buildRequestValidationErrorMessage('robot_id'));
        }

        result.data.robot_realm_id = result.relation.robot.realm_id;
    }

    // ----------------------------------------------

    return result;
}
