/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { Robot } from '@typescript-auth/domains';
import { ExpressRequest } from '../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';

export async function runClientValidation(req: ExpressRequest, operation: 'create' | 'update') : Promise<Partial<Robot>> {
    await check('secret')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .optional()
        .run(req);

    await check('active')
        .isBoolean()
        .optional()
        .run(req);

    await check('name')
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .optional({ nullable: true })
        .run(req);

    await check('description')
        .notEmpty()
        .isLength({ min: 3, max: 4096 })
        .optional({ nullable: true })
        .run(req);

    await check('user_id')
        .exists()
        .isUUID()
        .optional({ nullable: true })
        .run(req);

    if (operation === 'create') {
        await check('realm_id')
            .exists()
            .notEmpty()
            .isString()
            .optional()
            .run(req);
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    return matchedValidationData(req, { includeOptionals: true });
}
