/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import {
    applyFields,
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { ScopeEntity, resolveRealm } from '../../../../../database/domains/index.ts';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request/index.ts';

export async function getManyScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.SCOPE_READ,
            PermissionName.SCOPE_UPDATE,
            PermissionName.SCOPE_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ScopeEntity);
    const query = repository.createQueryBuilder('scope');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'scope',
        fields: {
            allowed: [
                'id',
                'built_in',
                'name',
                'display_name',
                'description',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['id', 'built_in', 'name', 'realm_id'],
        },
        pagination: {
            maxLimit: 50,
        },
        sort: {
            allowed: ['id', 'name', 'updated_at', 'created_at'],
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

export async function getOneScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.SCOPE_READ,
            PermissionName.SCOPE_UPDATE,
            PermissionName.SCOPE_DELETE,
        ],
    });

    const id = useRequestParamID(req, {
        isUUID: false,
    });
    const fields = useRequestQuery(req, 'fields');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ScopeEntity);
    const query = repository.createQueryBuilder('scope');

    if (isUUID(id)) {
        query.where('scope.id = :id', { id });
    } else {
        query.where('scope.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'));
        if (realm) {
            query.andWhere('scope.realm_id = :realmId', { realmId: realm.id });
        }
    }

    applyFields(query, fields, {
        defaultAlias: 'scope',
        allowed: [
            'id',
            'built_in',
            'name',
            'display_name',
            'description',
            'realm_id',
            'created_at',
            'updated_at',
        ],
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
