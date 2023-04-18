/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { PermissionName, isUUID } from '@authup/core';
import { IdentityProviderEntity, IdentityProviderRepository, resolveRealm } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

export async function getManyIdentityProviderRouteHandler(req: Request, res: Response): Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderEntity);

    const query = repository.createQueryBuilder('provider');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
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
            allowed: ['name', 'realm_id', 'realm.name'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
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

export async function getOneIdentityProviderRouteHandler(req: Request, res: Response): Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const query = repository.createQueryBuilder('provider');

    if (isUUID(id)) {
        query.where('provider.id = :id', { id });
    } else {
        query.where('provider.slug LIKE :slug', { slug: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('provider.realm_id = :realmId', { realmId: realm.id });
    }

    applyQuery(query, useRequestQuery(req), {
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

    const ability = useRequestEnv(req, 'ability');
    if (
        ability.has(PermissionName.PROVIDER_EDIT)
    ) {
        await repository.extendEntity(entity);
    }

    return send(res, entity);
}
