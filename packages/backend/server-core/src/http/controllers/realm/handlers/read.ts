/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RealmEntity } from '../../../../domains';

export async function getManyRealmRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const query = repository.createQueryBuilder('realm');

    const { pagination } = applyQuery(query, req.query, {
        defaultAlias: 'realm',
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
