/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotRoleEntity } from '../../../../domains';
import { runRobotRoleValidation } from '../utils';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function createRobotRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROBOT_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const result = await runRobotRoleValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
