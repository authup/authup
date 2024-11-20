/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName, ROLE_ADMIN_NAME } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RoleEntity } from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';

export async function deleteRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.ROLE_DELETE });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (entity.name === ROLE_ADMIN_NAME) {
        throw new BadRequestError('The default admin role can not be deleted.');
    }

    // ----------------------------------------------

    await permissionChecker.check({
        name: PermissionName.ROLE_DELETE,
        data: {
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
