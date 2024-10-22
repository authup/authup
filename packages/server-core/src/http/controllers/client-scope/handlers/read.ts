/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import {
    applyQuery, useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { ClientScopeEntity } from '../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../request';

export async function getManyClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);

    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    const query = repository.createQueryBuilder('clientScope');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'clientScope',
        relations: {
            allowed: ['client', 'scope'],
        },
        filters: {
            allowed: ['client_id', 'scope_id', 'default', 'scope.name'],
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

export async function getOneClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ],
    });

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
