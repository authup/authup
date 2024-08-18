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
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PolicyRepository, resolveRealm } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function getManyPolicyRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const hasOneOf = permissionChecker.hasOneOf([
        PermissionName.PERMISSION_READ,
        PermissionName.PERMISSION_UPDATE,
        PermissionName.PERMISSION_DELETE,
    ]);
    if (!hasOneOf) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    const query = repository.createQueryBuilder('policy');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'policy',
        relations: {
            allowed: ['realm'],
        },
        fields: {
            default: [
                'id',
                'built_in',
                'type',
                'display_name',
                'name',
                'description',
                'invert',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['name', 'type', 'realm_id', 'realm.name'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const [entities, total] = await query.getManyAndCount();

    await repository.findAndAppendExtraAttributesToMany(entities);

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

export async function getOnePolicyRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    const hasOneOf = permissionChecker.hasOneOf([
        PermissionName.PERMISSION_READ,
        PermissionName.PERMISSION_UPDATE,
        PermissionName.PERMISSION_DELETE,
    ]);
    if (!hasOneOf) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    const query = repository.createQueryBuilder('policy');

    if (isUUID(id)) {
        query.where('policy.id = :id', { id });
    } else {
        query.where('policy.name LIKE :name', { name: id });

        const realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('policy.realm_id = :realmId', { realmId: realm.id });
    }

    applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'policy',
        fields: {
            default: [
                'id',
                'built_in',
                'type',
                'name',
                'display_name',
                'description',
                'invert',
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

    await repository.findAndAppendExtraAttributesTo(entity);

    return send(res, entity);
}
