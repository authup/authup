/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/query';
import {
    Request, Response, send, useRequestParam,
} from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { PermissionEntity } from '@authup/server-database';

export async function getManyPermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const query = repository.createQueryBuilder('permission');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'permission',
        filters: {
            allowed: ['id', 'name'],
        },
        pagination: {
            maxLimit: 50,
        },
        sort: {
            allowed: ['id', 'name', 'created_at', 'updated_at'],
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

export async function getOnePermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const result = await repository.createQueryBuilder('permission')
        .where('id = :id', { id })
        .getOne();

    if (!result) {
        throw new NotFoundError();
    }

    return send(res, result);
}
