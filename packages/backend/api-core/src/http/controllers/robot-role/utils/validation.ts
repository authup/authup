/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@typescript-error/http';
import { isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest } from '../../../type';
import { RobotRoleValidationResult } from '../type';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { extendExpressValidationResultWithRobot } from '../../robot/utils/extend';
import { extendExpressValidationResultWithRole } from '../../role/utils/extend';
import { CRUDOperation } from '../../../constants';

export async function runRobotRoleValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<RobotRoleValidationResult> {
    const result : RobotRoleValidationResult = {
        data: {},
        meta: {},
    };

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
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRole(result);
    if (result.meta.role) {
        if (!isPermittedForResourceRealm(req.realmId, result.meta.role.realm_id)) {
            throw new BadRequestError(buildExpressValidationErrorMessage('role_id'));
        }
    }

    await extendExpressValidationResultWithRobot(result);
    if (result.meta.robot) {
        if (
            !isPermittedForResourceRealm(req.realmId, result.meta.robot.realm_id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('robot_id'));
        }
    }

    // ----------------------------------------------

    return result;
}
