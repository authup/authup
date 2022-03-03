/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { PermissionID, UserRole } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRoleEntity } from '../../../../domains';

export async function deleteUserRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.USER_ROLE_DROP)) {
        throw new NotFoundError();
    }

    const repository = getRepository(UserRoleEntity);

    const entity : UserRole | undefined = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({ data: entity });
}
