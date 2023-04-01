/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { isValidRealmName } from '@authup/core';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { PermissionEntity } from '../../../../domains';
import { RealmEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request/constants';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
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

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    // ----------------------------------------------

    return result;
}
