/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import {
    Request, Response, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserPermissionEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

/**
 * Drop a permission by id of a specific user.
 *
 * @param req
 * @param res
 */
export async function deleteUserPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.USER_PERMISSION_DROP)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserPermissionEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (
        !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), entity.user_realm_id)
    ) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    if (!ability.matchTarget(PermissionID.USER_PERMISSION_DROP, entity.target)) {
        throw new ForbiddenError('You are not permitted for the role-permission target.');
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
