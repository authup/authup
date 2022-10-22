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
import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { IdentityProviderEntity, IdentityProviderRepository } from '../../../../domains';

export async function getManyIdentityProviderRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderEntity);

    const query = repository.createQueryBuilder('provider');

    const { pagination } = applyQuery(query, req.query, {
        defaultAlias: 'provider',
        relations: {
            allowed: ['realm'],
        },
        fields: {
            default: [
                'id',
                'slug',
                'name',
                'protocol',
                'protocol_config',
                'enabled',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['realm_id', 'realm.name'],
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
                ...pagination,
            },
        },
    });
}

export async function getOneIdentityProviderRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const query = repository.createQueryBuilder('provider')
        .where('provider.id = :id', { id });

    applyQuery(query, req.query, {
        defaultAlias: 'provider',
        fields: {
            default: [
                'id',
                'slug',
                'name',
                'protocol',
                'protocol_config',
                'enabled',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        relations: {
            allowed: ['realm'],
        },
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if (
        req.ability &&
        req.ability.has(PermissionID.PROVIDER_EDIT)
    ) {
        await repository.extendEntity(entity);
    }

    return res.respond({
        data: entity,
    });
}
