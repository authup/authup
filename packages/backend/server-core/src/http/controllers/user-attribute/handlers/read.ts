/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Brackets } from 'typeorm';
import { applyFilters, applyPagination, applySort } from 'typeorm-extension';
import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';
import { isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserAttributeEntity, onlyRealmPermittedQueryResources } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function getManyUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { filter, page, sort } = req.query;
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const query = repository.createQueryBuilder('userAttribute');

    query.where(new Brackets((qb) => {
        onlyRealmPermittedQueryResources(query, req.realmId);

        qb.orWhere('userAttribute.user_id = :userId', { userId: req.userId });
    }));

    applyFilters(query, filter, {
        defaultAlias: 'userAttribute',
        allowed: ['id', 'name', 'user_id', 'realm_id'],
    });

    applySort(query, sort, {
        defaultAlias: 'userAttribute',
        allowed: ['id', 'name', 'user_id', 'realm_id', 'created_at', 'updated_at'],
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

export async function getOneUserAttributeRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new BadRequestError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const result = await repository.findOneBy({ id });

    if (!result) {
        throw new NotFoundError();
    }

    if (
        !isPermittedForResourceRealm(req.realmId, result.realm_id) &&
        req.userId !== result.user_id
    ) {
        throw new ForbiddenError('You are not authorized to read this user attribute...');
    }

    return res.respond({
        data: result,
    });
}
