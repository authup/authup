/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserPermissionEntity } from '../../../../domains';
import { runUserPermissionValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createUserPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.USER_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const result = await runUserPermissionValidation(req, CRUDOperation.CREATE);

    // ----------------------------------------------

    const repository = getRepository(UserPermissionEntity);
    let rolePermission = repository.create(result.data);

    rolePermission = await repository.save(rolePermission);

    return res.respondCreated({
        data: rolePermission,
    });
}
