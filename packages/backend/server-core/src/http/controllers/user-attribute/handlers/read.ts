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
import { Brackets } from 'typeorm';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { isPermittedForResourceRealm } from '@authelion/common';
import { UserAttributeEntity, onlyRealmPermittedQueryResources } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

export async function getManyUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const query = repository.createQueryBuilder('userAttribute');

    query.where(new Brackets((qb) => {
        onlyRealmPermittedQueryResources(query, useRequestEnv(req, 'realmId'));

        qb.orWhere('userAttribute.user_id = :userId', { userId: useRequestEnv(req, 'userId') });
    }));

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'userAttribute',
        filters: {
            allowed: ['id', 'name', 'user_id', 'realm_id'],
        },
        sort: {
            allowed: ['id', 'name', 'user_id', 'realm_id', 'created_at', 'updated_at'],
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

export async function getOneUserAttributeRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParam(req, 'id');

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
        !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), result.realm_id) &&
        useRequestEnv(req, 'userId') !== result.user_id
    ) {
        throw new ForbiddenError('You are not authorized to read this user attribute...');
    }

    return send(res, result);
}
