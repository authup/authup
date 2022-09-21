/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import {
    PermissionID, isPermittedForResourceRealm, isValidUserName,
} from '@authelion/common';
import { BadRequestError } from '@ebec/http';
import {
    ExpressValidationError,
    ExpressValidationResult,
    buildExpressValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../express-validation';
import { ExpressRequest } from '../../../type';
import { CRUDOperation } from '../../../constants';
import { RealmEntity, UserEntity } from '../../../../domains';

export async function runUserValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<UserEntity>> {
    const result : ExpressValidationResult<UserEntity> = initExpressValidationResult();

    const nameChain = check('name')
        .exists()
        .notEmpty()
        .custom((value) => {
            const isValid = isValidUserName(value);
            if (!isValid) {
                throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
            }

            return isValid;
        });
    if (operation === CRUDOperation.UPDATE) {
        nameChain.optional();
    }
    await nameChain.run(req);

    if (
        req.ability.has(PermissionID.USER_ADD) ||
        req.ability.has(PermissionID.USER_EDIT)
    ) {
        await check('name_locked')
            .isBoolean()
            .optional()
            .run(req);
    }

    // ----------------------------------------------

    await check('first_name')
        .notEmpty()
        .isLength({ min: 3, max: 128 })
        .optional({ nullable: true })
        .run(req);

    await check('last_name')
        .notEmpty()
        .isLength({ min: 3, max: 128 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    await check('display_name')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 128 })
        .optional()
        .run(req);

    // ----------------------------------------------

    await check('email')
        .exists()
        .normalizeEmail()
        .isEmail()
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    await check('password')
        .exists()
        .isLength({ min: 5, max: 512 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    if (
        req.ability.has(PermissionID.USER_ADD) ||
        req.ability.has(PermissionID.USER_EDIT)
    ) {
        await check('active')
            .isBoolean()
            .optional()
            .run(req);

        if (operation === CRUDOperation.CREATE) {
            await check('realm_id')
                .exists()
                .notEmpty()
                .isString()
                .optional()
                .run(req);
        }

        await check('status')
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true })
            .run(req);

        await check('status_message')
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true })
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
