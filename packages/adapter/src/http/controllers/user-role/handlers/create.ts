/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import { PermissionID, UserRole } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';

export async function createUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    await check('user_id')
        .exists()
        .isUUID()
        .run(req);

    await check('role_id')
        .exists()
        .isUUID()
        .run(req);

    if (!req.ability.hasPermission(PermissionID.USER_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });

    const repository = getRepository(UserRole);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
