/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import {
    Permission, PermissionID,
} from '@typescript-auth/domains';
import { ExpressValidationError } from '../../../error/validation';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function createOnePermissionRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    if (!req.ability.hasPermission(PermissionID.PERMISSION_MANAGE)) {
        throw new ForbiddenError();
    }

    await check('id')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 30 })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });

    const repository = getRepository(Permission);
    const role = repository.create(data);

    await repository.save(role);

    return res.respondCreated({
        data: {
            id: role.id,
        },
    });
}
