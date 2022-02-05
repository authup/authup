/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    applyFilters, applyPagination,
} from 'typeorm-extension';
import { NotFoundError } from '@typescript-error/http';
import { OAuth2ProviderRole } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ProviderRoleEntity } from '../../../../domains';

export async function getManyOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { page, filter } = req.query;

    const repository = getRepository(OAuth2ProviderRoleEntity);

    const query = repository.createQueryBuilder('providerRole');

    applyFilters(query, filter, {
        defaultAlias: 'providerRole',
        allowed: ['role_id', 'provider_id'],
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

// ---------------------------------------------------------------------------------

export async function getOneOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(OAuth2ProviderRoleEntity);

    const query = repository.createQueryBuilder('providerRole')
        .where('providerRole.id = :id', { id });

    const result = await query.getOne();

    if (typeof result === 'undefined') {
        throw new NotFoundError();
    }

    return res.respond({
        data: result,
    });
}
