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
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import {
    RoleAttributeEntity,
} from '../../../../../database/domains/index.ts';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request/index.ts';

export async function getManyRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.ROLE_READ,
            PermissionName.ROLE_UPDATE,
            PermissionName.ROLE_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const query = repository.createQueryBuilder('roleAttribute');

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

    const queryOutput = await query.getManyAndCount();

    const [entities] = queryOutput;
    let [, total] = queryOutput;

    const data : RoleAttributeEntity[] = [];

    for (let i = 0; i < entities.length; i++) {
        try {
            await permissionChecker.checkOneOf({
                name: [
                    PermissionName.ROLE_READ,
                    PermissionName.ROLE_UPDATE,
                    PermissionName.ROLE_DELETE,
                ],
                input: {
                    attributes: queryOutput[0][i],
                },
            });
            data.push(entities[i]);
        } catch (e) {
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

export async function getOneRoleAttributeRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.ROLE_READ,
            PermissionName.ROLE_UPDATE,
            PermissionName.ROLE_DELETE,
        ],
    });

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    await permissionChecker.checkOneOf({
        name: [
            PermissionName.ROLE_READ,
            PermissionName.ROLE_UPDATE,
            PermissionName.ROLE_DELETE,
        ],
        input: {
            attributes: entity,
        },
    });

    return send(res, entity);
}
