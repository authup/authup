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
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RobotRoleEntity } from '../../../../domains';
import { useRequestParamID } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function getManyRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.ROBOT_ROLE_READ,
        PermissionName.ROBOT_ROLE_UPDATE,
        PermissionName.ROBOT_ROLE_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotRoleEntity);
    const query = repository.createQueryBuilder('robotRole');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'robotRole',
        filters: {
            allowed: ['robot_id', 'role_id'],
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

export async function getOneRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.ROBOT_ROLE_READ,
        PermissionName.ROBOT_ROLE_UPDATE,
        PermissionName.ROBOT_ROLE_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotRoleEntity);
    const entities = await repository.findOneBy({ id });

    if (!entities) {
        throw new NotFoundError();
    }

    return send(res, entities);
}
