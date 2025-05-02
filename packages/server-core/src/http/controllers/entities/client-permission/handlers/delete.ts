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
import { ClientPermissionEntity } from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';

/**
 * Drop a permission by id of a specific user.
 *
 * @param req
 * @param res
 */
export async function deleteClientPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.CLIENT_PERMISSION_DELETE });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientPermissionEntity);
    const entity = await repository.findOne({
        where: {
            id,
        },
        relations: {
            client: true,
            permission: true,
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    await permissionChecker.check({
        name: PermissionName.CLIENT_PERMISSION_DELETE,
        input: {
            attributes: entity,
        },
    });

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
