/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { isRealmResourceWritable } from '@authup/core-kit';
import type { Request } from 'routup';
import type { RolePermissionEntity } from '../../../../domains';
import { PermissionEntity, RoleEntity } from '../../../../domains';
import { isRequestSubOwner, useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

export async function runRolePermissionValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<RolePermissionEntity>> {
    const result : ExpressValidationResult<RolePermissionEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('role_id')
            .exists()
            .isUUID()
            .run(req);

        await check('permission_id')
            .exists()
            .isUUID()
            .run(req);
    }

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
            throw new ForbiddenError('It is only allowed to assign role permissions, which are also owned.');
        }
    }

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RoleEntity, {
        id: 'role_id',
        entity: 'role',
    });

    if (result.relation.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.role.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.relation.role.realm_id;
    }

    // ----------------------------------------------

    return result;
}
