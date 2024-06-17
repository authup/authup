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
import { PolicyRepository, resolveRealm } from '../../../../domains';

export async function getManyPolicyRouteHandler(req: Request, res: Response): Promise<any> {
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
                'type',
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
    const id = useRequestParam(req, 'id');

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
                'type',
                'name',
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
