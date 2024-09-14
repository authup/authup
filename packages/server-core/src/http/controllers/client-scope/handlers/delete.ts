/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientScopeEntity } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function deleteClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheck({
        name: PermissionName.CLIENT_SCOPE_DELETE,
    });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);

    const entity = await repository.findOne({
        where: {
            id,
        },
        relations: ['client'],
    });

    if (!entity) {
        throw new NotFoundError();
    }

    await permissionChecker.check({
        name: PermissionName.CLIENT_SCOPE_DELETE,
        data: {
            attributes: entity,
        },
    });

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
