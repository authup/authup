/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isPropertySet, isRealmResourceWritable } from '@authup/common';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { RobotEntity } from '@authup/server-database';
import { RealmEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildHTTPValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request/constants';

export async function runRobotValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RobotEntity>> {
    const result : ExpressValidationResult<RobotEntity> = initExpressValidationResult();

    await check('secret')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .optional()
        .run(req);

    await check('active')
        .isBoolean()
        .optional()
        .run(req);

    await check('name')
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .optional({ nullable: true })
        .run(req);

    await check('description')
        .notEmpty()
        .isLength({ min: 3, max: 4096 })
        .optional({ nullable: true })
        .run(req);

    await check('user_id')
        .exists()
        .isUUID()
        .optional({ nullable: true })
        .run(req);

    await check('realm_id')
        .exists()
        .isUUID()
        .optional()
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (
        operation === RequestHandlerOperation.CREATE &&
        !result.data.realm_id
    ) {
        const { id: realmId } = useRequestEnv(req, 'realm');
        result.data.realm_id = realmId;
    }

    if (isPropertySet(result.data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.data.realm_id)) {
            throw new BadRequestError(buildHTTPValidationErrorMessage('realm_id'));
        }
    }

    // ----------------------------------------------

    return result;
}
