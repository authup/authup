/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RoleEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function deleteRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_DROP)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    const entity = await repository.findOneBy({ id });

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const ownedPermission = req.ability.findPermission(PermissionID.ROLE_DROP);
    if (ownedPermission.target !== entity.target) {
        throw new ForbiddenError('You are not permitted for the role target.');
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
