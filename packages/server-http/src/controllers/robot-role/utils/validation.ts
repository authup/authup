/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import { isRealmResourceWritable } from '@authup/common';
import { Request } from 'routup';
import { RobotEntity, RobotRoleEntity, RoleEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildHTTPValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult, matchedValidationData,
} from '../../../validation';
import { CRUDOperation } from '../../../constants';

export async function runRobotRoleValidation(
    req: Request,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RobotRoleEntity>> {
    const result : ExpressValidationResult<RobotRoleEntity> = initExpressValidationResult();

    if (operation === CRUDOperation.CREATE) {
        await check('robot_id')
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
        id: 'role_realm_id',
        entity: 'role',
    });

    if (
        result.relation.role &&
        result.relation.role.realm_id
    ) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.role.realm_id)) {
            throw new BadRequestError(buildHTTPValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.relation.role.realm_id;
    }

    await extendExpressValidationResultWithRelation(result, RobotEntity, {
        id: 'robot_id',
        entity: 'robot',
    });

    if (result.relation.robot) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.robot.realm_id)) {
            throw new BadRequestError(buildHTTPValidationErrorMessage('robot_id'));
        }

        result.data.robot_realm_id = result.relation.robot.realm_id;
    }

    // ----------------------------------------------

    return result;
}
