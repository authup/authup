/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { buildKeyPath } from 'redis-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotRoleEntity } from '../../../../domains';
import { runRobotRoleValidation } from '../utils';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';
import { CachePrefix } from '../../../../redis/constants';

export async function createRobotRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROBOT_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const result = await runRobotRoleValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    if (dataSource.queryResultCache) {
        await dataSource.queryResultCache.remove([
            buildKeyPath({
                prefix: CachePrefix.ROBOT_OWNED_ROLES,
                id: entity.robot_id,
            }),
        ]);
    }

    return res.respondCreated({
        data: entity,
    });
}
