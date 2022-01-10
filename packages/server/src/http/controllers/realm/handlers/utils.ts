/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check } from 'express-validator';
import { ExpressRequest } from '../../../type';

export async function runRealmValidation(req: ExpressRequest, operation: 'create' | 'update') {
    if (operation === 'create') {
        await check('id')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 36 })
            .matches(/^[a-z0-9-_]*$/)
            .run(req);
    }

    const nameChain = await check('name')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 128 });

    if (operation === 'update') nameChain.optional({ nullable: true });

    await nameChain.run(req);

    await check('description')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 5, max: 4096 })
        .optional({ nullable: true })
        .run(req);
}
