/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { UserPermissionEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

/**
 * Receive user permissions of a specific user.
 *
 * @param req
 * @param res
 */
export async function getManyUserPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.USER_PERMISSION_READ) &&
        !ability.has(PermissionName.USER_PERMISSION_CREATE) &&
        !ability.has(PermissionName.USER_PERMISSION_DELETE)
    ) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const robotPermissionRepository = dataSource.getRepository(UserPermissionEntity);
    const query = robotPermissionRepository.createQueryBuilder('userPermission');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'userPermission',
        filters: {
            allowed: ['user_id', 'permission_id'],
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

/**
 * Receive a specific permission of a specific user.
 *
 * @param req
 * @param res
 */
export async function getOneUserPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.USER_PERMISSION_READ) &&
        !ability.has(PermissionName.USER_PERMISSION_CREATE) &&
        !ability.has(PermissionName.USER_PERMISSION_DELETE)
    ) {
        throw new ForbiddenError();
    }

    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const robotPermissionRepository = dataSource.getRepository(UserPermissionEntity);
    const entity = await robotPermissionRepository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
