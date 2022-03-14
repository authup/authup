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
import { RoleAttributeValidationResult } from '../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { RoleRepository } from '../../../../domains';

export async function runRoleAttributeValidation(req: ExpressRequest, operation: 'create' | 'update') : Promise<RoleAttributeValidationResult> {
    const result : RoleAttributeValidationResult = {
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

        await check('role_id')
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
        if (result.data.role_id) {
            const roleRepository = getCustomRepository(RoleRepository);
            const role = await roleRepository.findOne(result.data.role_id);

            if (typeof role === 'undefined') {
                throw new BadRequestError('The referenced user was not found');
            }

            result.data.realm_id = role.realm_id;
            result.data.role_id = role.id;

            result.meta.role = role;
        } else {
            result.data.realm_id = req.realmId;
            result.data.role_id = req.userId;
        }
    }

    return result;
}
