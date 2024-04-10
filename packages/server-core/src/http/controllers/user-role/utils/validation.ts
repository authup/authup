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
import type { UserRoleEntity } from '../../../../domains';
import { RoleEntity, UserEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils/env';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request/constants';

export async function runUserRoleValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<UserRoleEntity>> {
    const result : ExpressValidationResult<UserRoleEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('user_id')
            .exists()
            .isUUID()
            .run(req);

        await check('role_id')
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

    await extendExpressValidationResultWithRelation(result, RoleEntity, {
        id: 'role_id',
        entity: 'role',
    });

    if (
        result.relation.role &&
        result.relation.role.realm_id
    ) {
        if (
            !isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.role.realm_id)
        ) {
            throw new BadRequestError(buildRequestValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.relation.role.realm_id;
    }

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
