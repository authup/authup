/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { applyFilters, applyPagination, useDataSource } from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRoleEntity } from '../../../../domains';

export async function getManyUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);
    const query = await repository.createQueryBuilder('user_roles');

    applyFilters(query, filter, {
        allowed: ['user_roles.role_id', 'user_roles.user_id'],
        defaultAlias: 'user_roles',
    });

    const pagination = applyPagination(query, page, { maxLimit: 50 });

    const [entities, total] = await query.getManyAndCount();

    return res.respond({
        data: {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        },
    });
}

export async function getOneUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);
    const entities = await repository.findOneBy({ id });

    if (!entities) {
        throw new NotFoundError();
    }

    return res.respond({ data: entities });
}
