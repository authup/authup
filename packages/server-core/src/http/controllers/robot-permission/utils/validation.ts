/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import { isRealmResourceWritable } from '@authup/core-kit';
import type { Request } from 'routup';
import type { RobotPermissionEntity } from '../../../../domains';
import { PermissionEntity, PolicyEntity, RobotEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

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
    }

    await check('policy_id')
        .isUUID()
        .optional({ values: 'null' })
        .default(null)
        .run(req);

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

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, PolicyEntity, {
        id: 'policy_id',
        entity: 'policy',
    });

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
