/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Role, isValidRoleName,
} from '@typescript-auth/domains';
import { check, matchedData, validationResult } from 'express-validator';
import { BadRequestError } from '@typescript-error/http';
import { ExpressValidationError } from '../../../error/validation';
import { ExpressRequest } from '../../../type';

export async function runRoleValidation(
    req: ExpressRequest,
    operation: 'create' | 'update',
) : Promise<Partial<Role>> {
    const nameChain = await check('name')
        .exists()
        .notEmpty()
        .custom((value) => {
            const isValid = isValidRoleName(value);
            if (!isValid) {
                throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
            }

            return isValid;
        });

    if (operation === 'update') nameChain.optional();

    await nameChain.run(req);

    await check('description')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 4096 })
        .optional({ nullable: true })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    return matchedData(req, { includeOptionals: true });
}
