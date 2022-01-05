/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { applyFilters, applyPagination } from 'typeorm-extension';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { Realm } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function getManyRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page } = req.query;
    const realmRepository = getRepository(Realm);

    const query = realmRepository.createQueryBuilder('realm');

    applyFilters(query, filter, {
        defaultAlias: 'realm',
        allowed: ['id', 'name'],
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

    const realmRepository = getRepository(Realm);

    const result = await realmRepository.findOne(id);

    if (typeof result === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({
        data: result,
    });
}
