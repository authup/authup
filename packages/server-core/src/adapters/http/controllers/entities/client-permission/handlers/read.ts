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
import { ClientPermissionEntity } from '../../../../../database/domains/index.ts';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request/index.ts';

export async function getManyClientPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.CLIENT_PERMISSION_CREATE,
            PermissionName.CLIENT_PERMISSION_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const clientPermissionRepository = dataSource.getRepository(ClientPermissionEntity);
    const query = clientPermissionRepository.createQueryBuilder('clientPermission');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'clientPermission',
        filters: {
            allowed: ['client_id', 'permission_id'],
        },
        relations: {
            allowed: [
                'client',
                'permission',
            ],
        },
        sort: {
            allowed: [
                'id',
                'created_at',
                'updated_at',
            ],
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

// ---------------------------------------------------------------------------------

export async function getOneClientPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.CLIENT_PERMISSION_CREATE,
            PermissionName.CLIENT_PERMISSION_DELETE,
        ],
    });

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const clientPermissionRepository = dataSource.getRepository(ClientPermissionEntity);
    const entity = await clientPermissionRepository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
