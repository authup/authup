import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { PermissionID, RolePermission } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RolePermissionEntity } from '../../../../domains';

/**
 * Drop an permission by id of a specific user.
 *
 * @param req
 * @param res
 */
export async function deleteRolePermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_PERMISSION_DROP)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(RolePermissionEntity);
    await repository.delete(id);

    return res.respondDeleted();
}
