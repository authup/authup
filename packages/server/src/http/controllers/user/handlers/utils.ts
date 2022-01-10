/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { PermissionID, Realm, User } from '@typescript-auth/domains';
import { matchedValidationData } from '../../../../utils';
import { ExpressValidationError } from '../../../error/validation';
import { ExpressRequest } from '../../../type';

export async function runUserValidation(
    req: ExpressRequest,
    operation: 'create' | 'update',
) : Promise<Partial<User>> {
    const nameChain = check('name')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 128 });
    if (operation === 'update') {
        nameChain.optional();
    }
    await nameChain.run(req);

    if (
        req.ability.hasPermission(PermissionID.USER_ADD) ||
        req.ability.hasPermission(PermissionID.USER_EDIT)
    ) {
        await check('name_locked')
            .isBoolean()
            .optional()
            .run(req);
    }

    // ----------------------------------------------

    await check('first_name')
        .notEmpty()
        .isLength({ min: 3, max: 128 })
        .optional({ nullable: true })
        .run(req);

    await check('last_name')
        .notEmpty()
        .isLength({ min: 3, max: 128 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    await check('display_name')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 128 })
        .optional()
        .run(req);

    // ----------------------------------------------

    await check('email')
        .exists()
        .normalizeEmail()
        .isEmail()
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    await check('password')
        .exists()
        .isLength({ min: 5, max: 512 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    if (
        req.ability.hasPermission(PermissionID.USER_ADD) ||
        req.ability.hasPermission(PermissionID.USER_EDIT)
    ) {
        await check('active')
            .isBoolean()
            .optional()
            .run(req);

        if (operation === 'create') {
            await check('realm_id')
                .exists()
                .notEmpty()
                .isString()
                .run(req);
        }

        await check('status')
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true })
            .run(req);

        await check('status_message')
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true })
            .run(req);
    }

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    return matchedValidationData(req, { includeOptionals: true });
}
