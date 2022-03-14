/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { getCustomRepository } from 'typeorm';
import { BadRequestError } from '@typescript-error/http';
import { ExpressRequest } from '../../../type';
import { UserAttributeValidationResult } from '../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { UserRepository } from '../../../../domains';

export async function runUserAttributeValidation(req: ExpressRequest, operation: 'create' | 'update') : Promise<UserAttributeValidationResult> {
    const result : UserAttributeValidationResult = {
        data: {},
        meta: {},
    };

    if (operation === 'create') {
        await check('key')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 255 })
            .run(req);

        await check('user_id')
            .exists()
            .isUUID()
            .optional();
    }

    await check('value')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    if (operation === 'create') {
        if (result.data.user_id) {
            const userRepository = getCustomRepository(UserRepository);
            const user = await userRepository.findOne(result.data.user_id);

            if (typeof user === 'undefined') {
                throw new BadRequestError('The referenced user was not found');
            }

            result.data.realm_id = user.realm_id;
            result.data.user_id = user.id;

            result.meta.user = user;
        } else {
            result.data.realm_id = req.realmId;
            result.data.user_id = req.userId;
        }
    }

    return result;
}
