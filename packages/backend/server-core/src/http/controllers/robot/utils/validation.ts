/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isPermittedForResourceRealm } from '@authelion/common';
import { BadRequestError } from '@ebec/http';
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
import { RealmEntity, RobotEntity } from '../../../../domains';

export async function runRobotValidation(
    req: ExpressRequest,
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
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (result.relation.realm) {
        if (
            !isPermittedForResourceRealm(req.realmId, result.relation.realm.id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }
    }

    if (
        operation === CRUDOperation.CREATE &&
        !result.data.realm_id
    ) {
        result.data.realm_id = req.realmId;
    }

    return result;
}
