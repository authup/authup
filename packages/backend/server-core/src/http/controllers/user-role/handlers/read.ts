/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRoleEntity } from '../../../../domains';

export async function getManyUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);
    const query = await repository.createQueryBuilder('userRole');

    const { pagination } = applyQuery(query, req.query, {
        defaultAlias: 'userRole',
        filters: {
            allowed: ['role_id', 'user_id'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

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
