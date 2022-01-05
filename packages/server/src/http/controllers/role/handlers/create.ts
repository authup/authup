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
    PermissionID, Role,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';

export async function createRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROLE_ADD)) {
        throw new ForbiddenError();
    }

    await check('name')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 30 })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });

    const roleRepository = getRepository(Role);
    const role = roleRepository.create(data);

    await roleRepository.save(role);

    return res.respondCreated({
        data: {
            id: role.id,
        },
    });
}
