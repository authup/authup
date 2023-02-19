/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName, isPropertySet, isRealmResourceWritable, isValidRoleName,
} from '@authup/common';
import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { RoleEntity } from '@authup/server-database';
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

export async function runRoleValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RoleEntity>> {
    const result : ExpressValidationResult<RoleEntity> = initExpressValidationResult();

    const nameChain = await check('name')
        .exists()
        .notEmpty()
        .custom((value) => {
            const isValid = isValidRoleName(value);
            if (!isValid) {
                throw new BadRequestError('Only the characters [A-Za-z0-9-_]+ are allowed.');
            }

            return isValid;
        });

    if (operation === RequestHandlerOperation.UPDATE) nameChain.optional();

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

    await check('realm_id')
        .exists()
        .isUUID()
        .optional({ nullable: true })
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

    if (isPropertySet(result.data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.data.realm_id)) {
            throw new BadRequestError(buildHTTPValidationErrorMessage('realm_id'));
        }
    } else if (
        operation === RequestHandlerOperation.CREATE &&
        !isRealmResourceWritable(useRequestEnv(req, 'realm'))
    ) {
        throw new BadRequestError(buildHTTPValidationErrorMessage('realm_id'));
    }

    // ----------------------------------------------

    const ability = useRequestEnv(req, 'ability');

    if (operation === RequestHandlerOperation.CREATE) {
        const permissionTarget = ability.getTarget(PermissionName.ROLE_ADD);
        if (permissionTarget) {
            result.data.target = permissionTarget;
        }
    } else {
        const permissionTarget = ability.getTarget(PermissionName.ROLE_EDIT);
        if (permissionTarget) {
            result.data.target = permissionTarget;
        }
    }

    // ----------------------------------------------

    return result;
}
