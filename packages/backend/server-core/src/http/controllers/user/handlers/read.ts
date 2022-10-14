/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyFields, applyFilters, applyPagination, applyRelations, applySort,
    useDataSource,
} from 'typeorm-extension';
import { Brackets } from 'typeorm';
import { NotFoundError } from '@ebec/http';
import { OAuth2SubKind, PermissionID, isSelfId } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRepository, onlyRealmPermittedQueryResources } from '../../../../domains';
import { resolveOAuth2SubAttributesForScope } from '../../../../oauth2';

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
        default: [
            'id',
            'name',
            'name_locked',
            'first_name',
            'last_name',
            'display_name',
            'avatar',
            'cover',
            'active',
            'created_at',
            'updated_at',
            'realm_id',
        ],
        allowed: [
            ...(req.ability.has(PermissionID.USER_EDIT) ? ['email'] : []),
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

    let attributes : string[] = [];

    if (
        isSelfId(id) &&
        req.userId
    ) {
        attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.USER, req.scopes);

        for (let i = 0; i < attributes.length; i++) {
            // todo: only select valid entity attributes :)
            query.addSelect(`user.${attributes[i]}`);
        }

        query.where('user.id = :id', { id: req.userId });
    } else {
        query.where(new Brackets((q2) => {
            q2.where('user.id = :id', { id });
            q2.orWhere('user.name LIKE :name', { name: id });
        }));
    }

    onlyRealmPermittedQueryResources(query, req.realmId);

    applyFields(query, fields, {
        defaultAlias: 'user',
        default: [
            'id',
            'name',
            'name_locked',
            'first_name',
            'last_name',
            'display_name',
            'avatar',
            'cover',
            'active',
            'created_at',
            'updated_at',
            'realm_id',
        ],
        allowed: [
            ...(req.ability.has(PermissionID.USER_EDIT) ? ['email'] : []),
        ],
    });

    applyRelations(query, include, {
        defaultAlias: 'user',
        allowed: ['realm', 'user_roles'],
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if (isSelfId(id) && req.userId) {
        await userRepository.appendAttributes(entity, attributes);
    }

    return res.respond({ data: entity });
}
