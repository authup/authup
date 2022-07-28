/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { applyFilters, applyPagination, applySort } from 'typeorm-extension';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RealmEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function getManyRealmRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { filter, page, sort } = req.query;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const query = repository.createQueryBuilder('realm');

    applyFilters(query, filter, {
        defaultAlias: 'realm',
        allowed: ['id', 'name'],
    });

    applySort(query, sort, {
        defaultAlias: 'realm',
        allowed: ['id', 'name', 'created_at', 'updated_at'],
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

export async function getOneRealmRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new BadRequestError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return res.respond({
        data: entity,
    });
}
