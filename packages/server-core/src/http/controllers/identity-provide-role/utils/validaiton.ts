/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isRealmResourceWritable } from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { IdentityProviderRoleMappingEntity } from '../../../../domains';
import { IdentityProviderEntity, RoleEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult,
    matchedValidationData,
} from '../../../validation';

export async function runIdentityProviderRoleValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<IdentityProviderRoleMappingEntity>> {
    const result : ExpressValidationResult<IdentityProviderRoleMappingEntity> = initExpressValidationResult();

    if (operation === RequestHandlerOperation.CREATE) {
        await check('provider_id')
            .exists()
            .isUUID()
            .run(req);

        await check('role_id')
            .exists()
            .isUUID()
            .run(req);
    }

    await check('name')
        .optional({ values: 'null' })
        .default(null)
        .run(req);

    await check('value')
        .optional({ values: 'null' })
        .default(null)
        .run(req);

    await check('value_is_regex')
        .notEmpty()
        .isBoolean()
        .run(req);

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
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.role.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.relation.role.realm_id;
    }

    await extendExpressValidationResultWithRelation(result, IdentityProviderEntity, {
        id: 'provider_id',
        entity: 'provider',
    });

    if (result.relation.provider) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.provider.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('provider_id'));
        }

        result.data.provider_realm_id = result.relation.provider.realm_id;
    }

    if (
        result.data.role_realm_id &&
        result.data.provider_realm_id &&
        result.data.role_realm_id !== result.data.provider_realm_id
    ) {
        throw new BadRequestError('It is not possible to map an identity provider to a role of another realm.');
    }

    return result;
}
