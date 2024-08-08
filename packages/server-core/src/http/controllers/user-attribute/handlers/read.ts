/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceReadable } from '@authup/core-kit';
import {
    UserAttributeEntity,
    onlyRealmReadableQueryResources,
} from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function getManyUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const userId = useRequestEnv(req, 'userId');
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.has(PermissionName.USER_READ);
    if (!userId && !hasAbility) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const query = repository.createQueryBuilder('userAttribute');

    if (!hasAbility) {
        query.orWhere('userAttribute.user_id = :userId', { userId });
    } else {
        onlyRealmReadableQueryResources(query, useRequestEnv(req, 'realm'));
    }

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'userAttribute',
        filters: {
            allowed: ['id', 'name', 'user_id', 'realm_id'],
        },
        sort: {
            allowed: ['id', 'name', 'user_id', 'realm_id', 'created_at', 'updated_at'],
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

export async function getOneUserAttributeRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParamID(req);

    const userId = useRequestEnv(req, 'userId');
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.has(PermissionName.USER_READ);
    if (!userId && !hasAbility) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isRealmResourceReadable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError('You are not permitted for the resource realm.');
    }

    if (
        userId !== entity.user_id &&
        !await ability.can(PermissionName.USER_READ, { attributes: entity })
    ) {
        throw new ForbiddenError();
    }

    return send(res, entity);
}
