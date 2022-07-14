/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyFields, applyFilters, applyPagination, applyRelations, applySort,
} from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRepository, onlyRealmPermittedQueryResources } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function getManyUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const {
        filter, page, include, fields, sort,
    } = req.query;

    const dataSource = await useDataSource();
    const userRepository = new UserRepository(dataSource);
    const query = userRepository.createQueryBuilder('user');

    onlyRealmPermittedQueryResources(query, req.realmId);

    applyFields(query, fields, {
        defaultAlias: 'user',
        allowed: [
            'id',
            'name',
            'display_name',
            ...(req.ability.hasPermission(PermissionID.USER_EDIT) ? ['email'] : []),
        ],
    });

    applyFilters(query, filter, {
        defaultAlias: 'user',
        allowed: ['id', 'name', 'realm_id'],
    });

    applyRelations(query, include, {
        defaultAlias: 'user',
        allowed: ['realm'],
    });

    applySort(query, sort, {
        defaultAlias: 'user',
        allowed: ['id', 'name', 'display_name', 'created_at', 'updated_at'],
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

export async function getOneUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;
    const { include, fields } = req.query;

    const dataSource = await useDataSource();
    const userRepository = new UserRepository(dataSource);
    const query = await userRepository.createQueryBuilder('user')
        .andWhere('user.id = :id', { id });

    onlyRealmPermittedQueryResources(query, req.realmId);

    if (
        req.ability.hasPermission(PermissionID.USER_EDIT) ||
        id === req.userId
    ) {
        applyFields(query, fields, {
            defaultAlias: 'user',
            allowed: ['email'],
        });
    }

    applyRelations(query, include, {
        defaultAlias: 'user',
        allowed: ['realm', 'user_roles'],
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    return res.respond({ data: entity });
}
