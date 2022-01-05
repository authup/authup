/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { applyFilters, applyPagination } from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { Permission } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function getManyPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const { filter, page } = req.query;

    const repository = getRepository(Permission);
    const query = repository.createQueryBuilder('permission');

    applyFilters(query, filter, {
        allowed: ['id'],
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

export async function getOnePermissionHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const { id } = req.params;

    const repository = getRepository(Permission);
    const result = await repository.createQueryBuilder('permission')
        .where('id = :id', { id })
        .getOne();

    if (typeof result === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({ data: result });
}
