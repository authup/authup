/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { PermissionEntity } from '../../../../../database/domains';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request';

export async function deletePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.PERMISSION_DELETE });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (entity.built_in) {
        throw new BadRequestError('A built-in permission can not be deleted.');
    }

    await permissionChecker.check({
        name: PermissionName.PERMISSION_DELETE,
        input: {
            attributes: entity,
        },
    });

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
