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
import { NotFoundError } from '@ebec/http';
import { PolicyRepository, resolveRealm } from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';

export async function getManyPolicyRouteHandler(req: Request, res: Response): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);
    const queryBuilder = repository.createQueryBuilder('policy');
    const query = useRequestQuery(req);

    const { pagination } = applyQuery(queryBuilder, query, {
        defaultAlias: 'policy',
        relations: {
            allowed: ['children', 'realm'],
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
                'parent_id',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        filters: {
            allowed: ['id', 'name', 'type', 'parent_id', 'realm_id', 'realm.name'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const [entities, total] = await queryBuilder.getManyAndCount();
    await repository.extendManyWithEA(entities);

    return send(res, {
        data: entities,
        meta: {
            total,
            ...pagination,
        },
    });
}

type PolicyGetOneOptions = {
    expanded?: boolean
};

export async function getOnePolicyRouteHandler(
    req: Request,
    res: Response,
    options: PolicyGetOneOptions = {},
): Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
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
                'parent_id',
                'realm_id',
                'created_at',
                'updated_at',
            ],
        },
        relations: {
            allowed: ['children', 'realm'],
        },
    });

    const entity = await query.getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if (options.expanded) {
        await repository.findDescendantsTree(entity);
    }

    await repository.extendOneWithEA(entity);

    return send(res, entity);
}
