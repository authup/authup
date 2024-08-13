/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';

import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { PermissionEntity } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function deletePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.PERMISSION_DELETE)) {
        throw new ForbiddenError('You are not allowed to drop a permission.');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(PermissionEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (entity.built_in) {
        throw new BadRequestError('A built-in permission can not be deleted.');
    }

    if (!await ability.safeCheck(PermissionName.PERMISSION_DELETE, { attributes: entity })) {
        throw new ForbiddenError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
