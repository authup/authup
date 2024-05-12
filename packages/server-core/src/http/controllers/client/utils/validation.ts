/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import {
    isPropertySet,
} from '@authup/kit';
import {
    isRealmResourceWritable,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import zod from 'zod';
import type { ClientEntity } from '../../../../domains';
import { RealmEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import type { ExpressValidationResult } from '../../../validation';
import {
    RequestValidationError,
    buildRequestValidationErrorMessage,
    extendExpressValidationResultWithRelation,
    initExpressValidationResult, matchedValidationData,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

export async function runOauth2ClientValidation(
    req: Request,
    operation: `${RequestHandlerOperation.CREATE}` | `${RequestHandlerOperation.UPDATE}`,
) : Promise<ExpressValidationResult<ClientEntity>> {
    const result : ExpressValidationResult<ClientEntity> = initExpressValidationResult();

    await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 256 })
        .run(req);

    await check('secret')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 256 })
        .optional({ nullable: true })
        .run(req);

    await check('redirect_uri')
        .exists()
        .notEmpty()
        .isString()
        .custom((value) => {
            const validator = zod.string().url();
            const urls = value.split(',');
            for (let i = 0; i < urls.length; i++) {
                const output = validator.safeParse(urls[i]);
                if (!output.success) {
                    throw new BadRequestError(buildRequestValidationErrorMessage('redirect_uri'));
                }
            }

            return true;
        })
        .optional({ nullable: true })
        .run(req);

    await check('base_url')
        .exists()
        .notEmpty()
        .isURL()
        .isLength({ min: 3, max: 2000 })
        .optional({ nullable: true })
        .run(req);

    await check('root_url')
        .exists()
        .notEmpty()
        .isURL()
        .isLength({ min: 3, max: 2000 })
        .optional({ nullable: true })
        .run(req);

    await check('grant_types')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    await check('scope')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    await check('is_confidential')
        .exists()
        .isBoolean()
        .optional()
        .run(req);

    if (operation === 'create') {
        await check('realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true })
            .default(null)
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

    // ----------------------------------------------

    return result;
}
