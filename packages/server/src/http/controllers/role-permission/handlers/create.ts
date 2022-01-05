/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import { PermissionID, RolePermission } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
async function createRolePermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    await check('role_id')
        .exists()
        .isInt()
        .run(req);

    await check('permission_id')
        .exists()
        .isString()
        .run(req);

    if (!req.ability.hasPermission(PermissionID.ROLE_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });

    const repository = getRepository(RolePermission);
    let rolePermission = repository.create(data);

    rolePermission = await repository.save(rolePermission);

    return res.respondCreated({
        data: rolePermission,
    });
}
