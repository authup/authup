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
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import { IdentityProviderRepository, resolveRealm } from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';

export async function getManyIdentityProviderRouteHandler(req: Request, res: Response): Promise<any> {
    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const query = repository.createQueryBuilder('provider');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'provider',
        relations: {
            allowed: ['realm'],
        },
        fields: {
            default: [
                'id',
                'name',
                'display_name',
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

    try {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_READ });

        for (let i = 0; i < entities.length; i++) {
            try {
                await permissionChecker.check({
                    name: PermissionName.IDENTITY_PROVIDER_READ,
                    data: { attributes: entities[i] },
                });

                await repository.extendOneWithEA(entities[i]);
            } catch (e) {
                // do nothing
            }
        }
    } catch (e) {
        // do nothing
    }

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOneIdentityProviderRouteHandler(req: Request, res: Response): Promise<any> {
    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const query = repository.createQueryBuilder('provider');

    if (isUUID(id)) {
        query.where('provider.id = :id', { id });
    } else {
        query.where('provider.name = :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('provider.realm_id = :realmId', { realmId: realm.id });
    }

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'provider',
        fields: {
            default: [
                'id',
                'name',
                'display_name',
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

    try {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.check({
            name: PermissionName.IDENTITY_PROVIDER_READ,
            data: { attributes: entity },
        });
        await repository.extendOneWithEA(entity);
    } catch (e) {
        // do nothing
    }

    return send(res, entity);
}
