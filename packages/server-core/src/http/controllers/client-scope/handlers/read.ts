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
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { ClientScopeEntity } from '../../../../domains';
import { useRequestIDParam } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function getManyClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.CLIENT_READ) &&
        !ability.has(PermissionName.CLIENT_UPDATE) &&
        !ability.has(PermissionName.CLIENT_DELETE)
    ) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    const query = await repository.createQueryBuilder('clientScope');

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
    const ability = useRequestEnv(req, 'abilities');
    if (
        !ability.has(PermissionName.CLIENT_READ) &&
        !ability.has(PermissionName.CLIENT_UPDATE) &&
        !ability.has(PermissionName.CLIENT_DELETE)
    ) {
        throw new ForbiddenError();
    }

    const id = useRequestIDParam(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return send(res, entity);
}
