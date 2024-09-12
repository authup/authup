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
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { PermissionEntity, resolveRealm } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function getManyPermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const query = repository.createQueryBuilder('permission');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'permission',
        filters: {
            allowed: ['id', 'display_name', 'name', 'built_in'],
        },
        pagination: {
            maxLimit: 50,
        },
        sort: {
            allowed: ['id', 'name', 'created_at', 'updated_at'],
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

export async function getOnePermissionRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    });

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);
    const query = repository.createQueryBuilder('permission');

    if (isUUID(id)) {
        query.where('permission.id = :id', { id });
    } else {
        query.where('permission.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'));
        if (realm) {
            query.andWhere('permission.realm_id = :realmId', { realmId: realm.id });
        }
    }

    const result = await query.getOne();

    if (!result) {
        throw new NotFoundError();
    }

    return send(res, result);
}
