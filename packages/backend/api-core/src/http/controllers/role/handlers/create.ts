/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import {
    PermissionID,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRoleValidation } from '../utils/validaiton';
import { RoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROLE_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runRoleValidation(req, CRUDOperation.CREATE);

    // ----------------------------------------------

    const roleRepository = getRepository(RoleEntity);
    const role = roleRepository.create(result.data);

    await roleRepository.save(role);

    return res.respondCreated({
        data: role,
    });
}
