/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { RobotPermissionEntity } from '../../../../domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../request';

export async function getManyRobotPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.ROBOT_PERMISSION_CREATE,
            PermissionName.ROBOT_PERMISSION_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const robotPermissionRepository = dataSource.getRepository(RobotPermissionEntity);
    const query = robotPermissionRepository.createQueryBuilder('robotPermission');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'robotPermission',
        filters: {
            allowed: ['robot_id', 'permission_id'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const [entities, total] = await query.getManyAndCount();

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

// ---------------------------------------------------------------------------------

export async function getOneRobotPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.ROBOT_PERMISSION_CREATE,
            PermissionName.ROBOT_PERMISSION_DELETE,
        ],
    });

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const robotPermissionRepository = dataSource.getRepository(RobotPermissionEntity);
    const entity = await robotPermissionRepository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
