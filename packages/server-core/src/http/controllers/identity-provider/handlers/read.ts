/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import { IdentityProviderEntity, IdentityProviderRepository, resolveRealm } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

export async function getManyIdentityProviderRouteHandler(req: Request, res: Response): Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.IDENTITY_PROVIDER_READ) &&
        !ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE) &&
        !ability.has(PermissionName.IDENTITY_PROVIDER_DELETE)
    ) {
        throw new ForbiddenError();
    }

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
                'preset',
                'enabled',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['name', 'protocol', 'enabled', 'realm_id', 'realm.name'],
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
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.IDENTITY_PROVIDER_READ) &&
        !ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE) &&
        !ability.has(PermissionName.IDENTITY_PROVIDER_DELETE)
    ) {
        throw new ForbiddenError();
    }

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
                'preset',
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
        ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE) ||
        ability.has(PermissionName.IDENTITY_PROVIDER_READ)
    ) {
        await repository.findAndAppendExtraAttributesTo(entity);
    }

    return send(res, entity);
}
