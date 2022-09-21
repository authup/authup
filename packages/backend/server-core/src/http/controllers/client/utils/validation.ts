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
    initExpressValidationResult, matchedValidationData,
} from '../../../express-validation';
import { CRUDOperation } from '../../../constants';
import { OAuth2ClientEntity, RealmEntity } from '../../../../domains';

export async function runOauth2ClientValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<OAuth2ClientEntity>> {
    const result : ExpressValidationResult<OAuth2ClientEntity> = initExpressValidationResult();

    await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 256 })
        .run(req);

    await check('secret')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 256 })
        .optional({ nullable: true })
        .run(req);

    await check('redirect_uri')
        .exists()
        .notEmpty()
        .isURL()
        .isLength({ min: 3, max: 2000 })
        .optional({ nullable: true })
        .run(req);

    await check('grant_types')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    await check('scope')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    await check('is_confidential')
        .exists()
        .isBoolean()
        .optional()
        .run(req);

    if (operation === CRUDOperation.CREATE) {
        await check('realm_id')
            .exists()
            .notEmpty()
            .isString()
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

    // ----------------------------------------------

    if (result.relation.realm) {
        if (!isPermittedForResourceRealm(req.realmId, result.relation.realm.id)) {
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
