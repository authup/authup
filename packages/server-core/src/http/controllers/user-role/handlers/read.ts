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
import { UserRoleEntity } from '../../../../domains';
import { useRequestIDParam } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function getManyUserRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.USER_ROLE_READ) &&
        !ability.has(PermissionName.USER_ROLE_CREATE) &&
        !ability.has(PermissionName.USER_ROLE_DELETE)
    ) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);
    const query = repository.createQueryBuilder('userRole');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'userRole',
        filters: {
            allowed: ['role_id', 'user_id'],
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

export async function getOneUserRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.USER_ROLE_READ) &&
        !ability.has(PermissionName.USER_ROLE_CREATE) &&
        !ability.has(PermissionName.USER_ROLE_DELETE)
    ) {
        throw new ForbiddenError();
    }

    const id = useRequestIDParam(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
