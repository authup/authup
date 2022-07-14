/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RoleAttributeEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function deleteRoleAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (
        !req.ability.has(PermissionID.ROLE_EDIT) ||
        !isPermittedForResourceRealm(req.realmId, entity.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to drop an attribute of this role...');
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
