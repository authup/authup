import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserPermissionEntity } from '../../../../domains';

/**
 * Drop an permission by id of a specific user.
 *
 * @param req
 * @param res
 */
export async function deleteUserPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.USER_PERMISSION_DROP)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(UserPermissionEntity);
    const entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (
        !isPermittedForResourceRealm(req.realmId, entity.user_realm_id)
    ) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const ownedPermission = req.ability.findPermission(PermissionID.USER_PERMISSION_DROP);
    if (ownedPermission.target !== entity.target) {
        throw new ForbiddenError('You are not permitted for the role-permission target.');
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
