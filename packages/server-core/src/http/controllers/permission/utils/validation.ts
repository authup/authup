/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRealmResourceWritable } from '@authup/core-kit';
import { isPropertySet } from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import { check, validationResult } from 'express-validator';
import type { Request } from 'routup';
import type { PermissionEntity } from '../../../../domains';
import { PolicyEntity, RealmEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError, buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult, matchedValidationData,
} from '../../../validation';

export async function runPermissionValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<PermissionEntity>> {
    const result : ExpressValidationResult<PermissionEntity> = initExpressValidationResult();

    const nameChain = check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 128 });

    if (operation === RequestHandlerOperation.UPDATE) nameChain.optional({ nullable: true });

    await nameChain.run(req);

    await check('description')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 4096 })
        .optional({ nullable: true })
        .run(req);

    await check('client_id')
        .isUUID()
        .optional({ values: 'null' })
        .default(null)
        .run(req);

    if (operation === 'create') {
        await check('realm_id')
            .isUUID()
            .optional({ values: 'null' })
            .default(null)
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

    await extendExpressValidationResultWithRelation(result, PolicyEntity, {
        id: 'policy_id',
        entity: 'policy',
    });

    // ----------------------------------------------

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'client_id',
        entity: 'client',
    });

    await extendExpressValidationResultWithRelation(result, RealmEntity, {
        id: 'realm_id',
        entity: 'realm',
    });

    if (isPropertySet(result.data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.data.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('realm_id'));
        }
    } else if (
        operation === RequestHandlerOperation.CREATE &&
        !isRealmResourceWritable(useRequestEnv(req, 'realm'))
    ) {
        throw new BadRequestError(buildRequestValidationErrorMessage('realm_id'));
    }

    return result;
}
