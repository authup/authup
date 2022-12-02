/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isRealmResourceWritable } from '@authelion/common';
import { BadRequestError } from '@ebec/http';
import { Request } from 'routup';
import { RealmEntity, RobotEntity } from '@authelion/server-database';
import { useRequestEnv } from '../../../utils/env';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildExpressValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { CRUDOperation } from '../../../constants';

export async function runRobotValidation(
    req: Request,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
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

    if (operation === CRUDOperation.CREATE) {
        await check('realm_id')
            .exists()
            .notEmpty()
            .isString()
            .optional()
            .run(req);
    }

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

    if (result.relation.realm) {
        if (
            !isRealmResourceWritable(useRequestEnv(req, 'realmId'), result.relation.realm.id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }
    }

    if (
        operation === CRUDOperation.CREATE &&
        !result.data.realm_id
    ) {
        result.data.realm_id = useRequestEnv(req, 'realmId');
    }

    return result;
}
