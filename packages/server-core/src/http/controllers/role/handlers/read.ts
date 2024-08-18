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
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RoleEntity, resolveRealm } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function getManyRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const hasPermission = await permissionChecker.hasOneOf([
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ]);
    if (!hasPermission) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    const query = repository.createQueryBuilder('role');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'role',
        fields: {
            allowed: [
                'id',
                'name',
                'display_name',
                'target',
                'description',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['id', 'name', 'target', 'realm_id'],
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

export async function getOneRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const hasPermission = await permissionChecker.hasOneOf([
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ]);
    if (!hasPermission) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req, {
        isUUID: false,
    });
    const fields = useRequestQuery(req, 'fields');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    const query = repository.createQueryBuilder('role');

    if (isUUID(id)) {
        query.where('role.id = :id', { id });
    } else {
        query.where('role.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'));
        if (realm) {
            query.andWhere('role.realm_id = :realmId', { realmId: realm.id });
        }
    }

    applyFields(query, fields, {
        defaultAlias: 'role',
        allowed: [
            'id',
            'name',
            'display_name',
            'target',
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
