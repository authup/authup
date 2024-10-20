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
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { IdentityProviderRoleMappingEntity } from '../../../../domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../request';

export async function getManyIdentityProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.IDENTITY_PROVIDER_READ,
            PermissionName.IDENTITY_PROVIDER_UPDATE,
            PermissionName.IDENTITY_PROVIDER_DELETE,
        ],
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);

    const query = repository.createQueryBuilder('providerRole');

    const { pagination } = applyQuery(query, useRequestQuery(req), {
        defaultAlias: 'providerRole',
        filters: {
            allowed: ['role_id', 'provider_id'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
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

export async function getOneIdentityProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.IDENTITY_PROVIDER_READ,
            PermissionName.IDENTITY_PROVIDER_UPDATE,
            PermissionName.IDENTITY_PROVIDER_DELETE,
        ],
    });

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);

    const query = repository.createQueryBuilder('providerRole')
        .where('providerRole.id = :id', { id });

    const result = await query.getOne();

    if (!result) {
        throw new NotFoundError();
    }

    return send(res, result);
}
