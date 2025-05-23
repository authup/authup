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
import { PermissionName } from '@authup/core-kit';
import {
    UserAttributeEntity,
} from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';
import { canRequestManageUserAttribute } from '../utils/authorization';

export async function getManyUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.USER_UPDATE,
            PermissionName.USER_SELF_MANAGE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const query = repository.createQueryBuilder('userAttribute');

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

    const queryOutput = await query.getManyAndCount();
    const [entities] = queryOutput;
    let [, total] = queryOutput;

    const data : UserAttributeEntity[] = [];
    for (let i = 0; i < entities.length; i++) {
        const canAbility = await canRequestManageUserAttribute(req, entities[i]);

        if (canAbility) {
            data.push(entities[i]);
        } else {
            total--;
        }
    }

    return send(res, {
        data,
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
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.USER_UPDATE,
            PermissionName.USER_SELF_MANAGE,
        ],
    });

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    const canAbility = await canRequestManageUserAttribute(req, entity);
    if (!canAbility) {
        throw new ForbiddenError();
    }

    return send(res, entity);
}
