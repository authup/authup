/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { IdentityProviderRoleEntity } from '../../../../domains';

export async function getManyIdentityProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleEntity);

    const query = repository.createQueryBuilder('providerRole');

    const context = applyQuery(query, req.query, {
        defaultAlias: 'providerRole',
        filters: {
            allowed: ['role_id', 'provider_id'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const [entities, total] = await query.getManyAndCount();

    return res.respond({
        data: {
            data: entities,
            meta: {
                total,
                pagination: context.pagination,
            },
        },
    });
}

// ---------------------------------------------------------------------------------

export async function getOneIdentityProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleEntity);

    const query = repository.createQueryBuilder('providerRole')
        .where('providerRole.id = :id', { id });

    const result = await query.getOne();

    if (!result) {
        throw new NotFoundError();
    }

    return res.respond({
        data: result,
    });
}
