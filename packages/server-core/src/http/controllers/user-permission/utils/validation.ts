/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request } from 'routup';
import type { UserPermissionEntity } from '../../../../domains';
import {
    PermissionEntity, UserEntity,
} from '../../../../domains';
import { isRequestSubOwner, useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request/constants';

export async function runUserPermissionValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<UserPermissionEntity>> {
    const result : ExpressValidationResult<UserPermissionEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('user_id')
            .exists()
            .isUUID()
            .run(req);

        await check('permission_id')
            .exists()
            .isString()
            .run(req);

        await check('target')
            .exists()
            .isString()
            .isLength({ min: 3, max: 16 })
            .optional({ nullable: true })
            .run(req);
    }

    await check('condition')
        .exists()
        .isObject()
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    const ability = useRequestEnv(req, 'abilities');

    await extendExpressValidationResultWithRelation(result, PermissionEntity, {
        id: 'permission_id',
        entity: 'permission',
    });

    if (result.relation.permission) {
        if (result.relation.permission.target) {
            result.data.target = result.relation.permission.target;
        }

        if (
            !isRequestSubOwner(req) &&
            !ability.has(result.relation.permission.name)
        ) {
            throw new ForbiddenError('It is only allowed to assign user permissions, which are also owned.');
        }
    }

    const permissionTarget = ability.findOne(PermissionName.USER_PERMISSION_ADD);
    if (permissionTarget) {
        result.data.target = permissionTarget.target;
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, UserEntity, {
        id: 'user_id',
        entity: 'user',
    });

    if (result.relation.user) {
        if (
            !isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.user.realm_id)
        ) {
            throw new BadRequestError(buildRequestValidationErrorMessage('user_id'));
        }

        result.data.user_realm_id = result.relation.user.realm_id;
    }

    // ----------------------------------------------

    return result;
}
