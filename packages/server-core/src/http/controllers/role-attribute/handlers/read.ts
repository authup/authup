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
    RoleAttributeEntity,
    onlyRealmWritableQueryResources,
} from '../../../../domains';
import { useRequestIDParam } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function getManyRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const query = repository.createQueryBuilder('roleAttribute');

    onlyRealmWritableQueryResources(query, useRequestEnv(req, 'realm'));

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
    const ability = useRequestEnv(req, 'abilities');
    const hasAbility = await ability.hasOneOf([
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ]);
    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const id = useRequestIDParam(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const result = await repository.findOneBy({ id });

    if (!result) {
        throw new NotFoundError();
    }

    if (
        !isRealmResourceReadable(useRequestEnv(req, 'realm'), result.realm_id)
    ) {
        throw new ForbiddenError('You are not authorized to read this role attribute...');
    }

    return send(res, result);
}
