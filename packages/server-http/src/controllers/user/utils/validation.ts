/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import {
    PermissionName, isPropertySet, isRealmResourceWritable, isValidUserName,
} from '@authup/common';
import { BadRequestError } from '@ebec/http';
import { Request } from 'routup';
import { RealmEntity, UserEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils';
import {
    ExpressValidationResult,
    RequestValidationError,
    buildHTTPValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { CRUDOperation } from '../../../constants';

export async function runUserValidation(
    req: Request,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<ExpressValidationResult<UserEntity>> {
    const ability = useRequestEnv(req, 'ability');
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
        ability.has(PermissionName.USER_ADD) ||
        ability.has(PermissionName.USER_EDIT)
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
        ability.has(PermissionName.USER_ADD) ||
        ability.has(PermissionName.USER_EDIT)
    ) {
        await check('active')
            .isBoolean()
            .optional()
            .run(req);

        if (operation === CRUDOperation.CREATE) {
            await check('realm_id')
                .exists()
                .isUUID()
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
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (
        operation === CRUDOperation.CREATE &&
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

    return result;
}
