/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { check } from 'express-validator';
import { PermissionID, Realm } from '@typescript-auth/common';
import { ExpressRequest } from '../../../type';

export async function runUserValidation(req: ExpressRequest, operation: 'create' | 'update') {
    await check('display_name').exists().notEmpty().isLength({ min: 3, max: 128 })
        .optional()
        .run(req);
    await check('email').exists().normalizeEmail().isEmail()
        .optional({ nullable: true })
        .run(req);
    await check('password').exists().isLength({ min: 5, max: 512 }).optional({ nullable: true })
        .run(req);

    if (operation !== 'update' || req.ability.hasPermission(PermissionID.USER_EDIT)) {
        const nameChain = check('name')
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 128 });

        if (operation === 'update') {
            nameChain.optional({ nullable: true });
        }

        await nameChain.run(req);

        // -------

        const realmChain = check('realm_id').exists().notEmpty().custom((value: any) => getRepository(Realm).findOne(value).then((realm: Realm | undefined) => {
            if (typeof realm === 'undefined') {
                throw new Error('The referenced realm was not found.');
            }
        }));

        if (operation === 'update') {
            realmChain.optional({ nullable: true });
        }

        await realmChain.run(req);
    }
}
