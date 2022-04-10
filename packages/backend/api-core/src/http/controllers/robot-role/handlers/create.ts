/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotRoleEntity } from '../../../../domains';
import { runRobotRoleValidation } from '../utils/validation';
import { CRUDOperation } from '../../../constants';

export async function createRobotRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROBOT_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const result = await runRobotRoleValidation(req, CRUDOperation.CREATE);

    const repository = getRepository(RobotRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
