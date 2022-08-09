/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isPermittedForResourceRealm } from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import { ExpressRequest } from '../../../type';
import { extendExpressValidationResultWithRealm } from '../../realm';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { IdentityProviderValidationResult } from '../type';
import { CRUDOperation } from '../../../constants';

export async function runOauth2ProviderValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<IdentityProviderValidationResult> {
    const result : IdentityProviderValidationResult = {
        data: {},
        meta: {},
    };

    await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 30 })
        .run(req);

    await check('open_id')
        .exists()
        .notEmpty()
        .isBoolean()
        .run(req);

    await check('token_host')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 512 })
        .run(req);

    await check('token_path')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 256 })
        .optional({ nullable: true })
        .run(req);
    await check('token_revoke_path')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 256 })
        .optional({ nullable: true })
        .run(req);

    await check('authorize_host')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 512 })
        .optional({ nullable: true })
        .run(req);

    await check('authorize_path')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 256 })
        .optional({ nullable: true })
        .run(req);

    await check('scope')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    await check('client_id')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 128 })
        .run(req);

    await check('client_secret')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 128 })
        .optional({ nullable: true })
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

    await extendExpressValidationResultWithRealm(result);
    if (result.meta.realm) {
        if (!isPermittedForResourceRealm(req.realmId, result.meta.realm.id)) {
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
