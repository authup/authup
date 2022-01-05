/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check } from 'express-validator';
import { ExpressRequest } from '../../../type';

export async function runOauth2ProviderRoleValidation(req: ExpressRequest, operation: 'create' | 'update') {
    if (operation === 'create') {
        await check('provider_id')
            .exists()
            .isString()
            .run(req);

        await check('role_id')
            .exists()
            .isInt()
            .run(req);
    }

    const externalPromise = await check('external_id')
        .exists()
        .isLength({ min: 3, max: 36 });
    if (operation === 'update') externalPromise.optional();

    await externalPromise.run(req);
}
