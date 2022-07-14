/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionID, isPermittedForResourceRealm, isValidRoleName,
} from '@authelion/common';
import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@typescript-error/http';
import {
    ExpressValidationError,
    buildExpressValidationErrorMessage,
    matchedValidationData,
} from '../../../express-validation';
import { ExpressRequest } from '../../../type';
import { RoleValidationResult } from '../type';
import { extendExpressValidationResultWithRealm } from '../../realm';
import { CRUDOperation } from '../../../constants';

export async function runRoleValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<RoleValidationResult> {
    const result : RoleValidationResult = {
        data: {},
        meta: {},
    };
    const nameChain = await check('name')
        .exists()
        .notEmpty()
        .custom((value) => {
            const isValid = isValidRoleName(value);
            if (!isValid) {
                throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
            }

            return isValid;
        });

    if (operation === CRUDOperation.UPDATE) nameChain.optional();

    await nameChain.run(req);

    await check('description')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 4096 })
        .optional({ nullable: true })
        .run(req);

    await check('target')
        .exists()
        .isString()
        .isLength({ min: 3, max: 16 })
        .optional({ nullable: true })
        .run(req);

    if (operation === CRUDOperation.CREATE) {
        await check('realm_id')
            .exists()
            .isString()
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

    await extendExpressValidationResultWithRealm(result);
    if (result.meta.realm) {
        if (
            !isPermittedForResourceRealm(req.realmId, result.meta.realm.id)
        ) {
            throw new BadRequestError(buildExpressValidationErrorMessage('realm_id'));
        }
    }

    if (operation === CRUDOperation.CREATE) {
        const permissionTarget = req.ability.getTarget(PermissionID.ROLE_ADD);
        if (permissionTarget) {
            result.data.target = permissionTarget;
        }
    } else {
        const permissionTarget = req.ability.getTarget(PermissionID.ROLE_EDIT);
        if (permissionTarget) {
            result.data.target = permissionTarget;
        }
    }

    return result;
}
