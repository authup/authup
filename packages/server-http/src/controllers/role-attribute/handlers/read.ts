/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/query';
import {
    Request, Response, send, useRequestParam,
} from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { isRealmResourceReadable } from '@authup/common';
import { RoleAttributeEntity, onlyRealmReadableQueryResources } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';

export async function getManyRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const query = repository.createQueryBuilder('roleAttribute');

    onlyRealmReadableQueryResources(query, useRequestEnv(req, 'realmId'));

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'roleAttribute',
        filters: {
            allowed: ['id', 'name', 'role_id', 'realm_id'],
        },
        sort: {
            allowed: ['id', 'name', 'role_id', 'realm_id', 'created_at', 'updated_at'],
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

export async function getOneRoleAttributeRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParam(req, 'id');

    if (typeof id !== 'string') {
        throw new BadRequestError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const result = await repository.findOneBy({ id });

    if (!result) {
        throw new NotFoundError();
    }

    if (
        !isRealmResourceReadable(useRequestEnv(req, 'realmId'), result.realm_id)
    ) {
        throw new ForbiddenError('You are not authorized to read this role attribute...');
    }

    return send(res, result);
}
