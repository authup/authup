/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { buildKeyPath } from 'redis-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import {
    RobotPermissionEntity,
} from '../../../../domains';
import { runRobotPermissionValidation } from '../utils';
import { useDataSource } from '../../../../database';
import { CachePrefix } from '../../../../redis/constants';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRobotPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROBOT_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const result = await runRobotPermissionValidation(req, 'create');

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotPermissionEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    if (dataSource.queryResultCache) {
        await dataSource.queryResultCache.remove([
            buildKeyPath({
                prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                id: entity.robot_id,
            }),
        ]);
    }

    return res.respondCreated({
        data: entity,
    });
}
