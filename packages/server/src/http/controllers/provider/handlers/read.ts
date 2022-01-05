/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    applyFields, applyFilters, applyPagination, applyRelations,
} from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { OAuth2Provider, PermissionID } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function getManyOauth2ProviderRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const {
        page, filter, fields, include,
    } = req.query;

    const repository = getRepository(OAuth2Provider);

    const query = repository.createQueryBuilder('provider');

    const relations = applyRelations(query, include, {
        defaultAlias: 'provider',
        allowed: ['realm'],
    });

    applyFilters(query, filter, {
        relations,
        defaultAlias: 'provider',
        allowed: ['realm_id', 'realm.name'],
    });

    if (
        req.ability &&
        req.ability.hasPermission(PermissionID.REALM_EDIT)
    ) {
        applyFields(
            query,
            fields,
            {
                defaultAlias: 'provider',
                allowed: ['client_secret'],
            },
        );
    }

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

export async function getOneOauth2ProviderRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const { fields, include } = req.query;
    const { id } = req.params;

    const repository = getRepository(OAuth2Provider);

    const query = repository.createQueryBuilder('provider')
        .where('provider.id = :id', { id });

    applyRelations(query, include, {
        defaultAlias: 'provider',
        allowed: ['realm'],
    });

    if (
        req.ability &&
        req.ability.hasPermission(PermissionID.REALM_EDIT)
    ) {
        applyFields(
            query,
            fields,
            {
                defaultAlias: 'provider',
                allowed: ['client_secret'],
            },
        );
    }

    const result = await query.getOne();

    if (typeof result === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({
        data: result,
    });
}
