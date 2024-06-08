/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { BadRequestError } from '@ebec/http';
import { isRealmResourceWritable } from '@authup/core-kit';
import type { Request } from 'routup';
import type { RolePermissionEntity } from '../../../../domains';
import { PermissionEntity, PolicyEntity, RoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
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

    await check('policy_id')
        .isUUID()
        .optional({ values: 'null' })
        .default(null)
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, PermissionEntity, {
        id: 'permission_id',
        entity: 'permission',
    });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, PolicyEntity, {
        id: 'policy_id',
        entity: 'policy',
    });

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
