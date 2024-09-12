/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserRepository } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function deleteUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheck({ name: PermissionName.USER_DELETE });

    if (useRequestEnv(req, 'userId') === id) {
        throw new BadRequestError('The own user can not be deleted.');
    }

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    await permissionChecker.check({ name: PermissionName.USER_DELETE, data: { attributes: entity } });

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError(`You are not authorized to drop a user fo the realm ${entity.realm_id}`);
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
