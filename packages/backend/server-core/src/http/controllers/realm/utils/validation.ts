/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check } from 'express-validator';
import { isValidRealmName } from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import { ExpressRequest } from '../../../type';
import { CRUDOperation } from '../../../constants';

export async function runRealmValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) {
    if (operation === CRUDOperation.CREATE) {
        await check('id')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 36 })
            .custom((value) => {
                const isValid = isValidRealmName(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [a-z0-9-_]+ are allowed.');
                }

                return isValid;
            })
            .run(req);
    }

    const nameChain = await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 128 });

    if (operation === CRUDOperation.UPDATE) nameChain.optional({ nullable: true });

    await nameChain.run(req);

    await check('description')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 4096 })
        .optional({ nullable: true })
        .run(req);
}
