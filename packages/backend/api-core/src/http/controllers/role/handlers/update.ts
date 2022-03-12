import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { PermissionID, Role } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRoleValidation } from './utils';
import { RoleEntity } from '../../../../domains';

export async function updateRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_EDIT)) {
        throw new NotFoundError();
    }

    const data = await runRoleValidation(req, 'update');
    if (!data) {
        return res.respondAccepted();
    }

    // ----------------------------------------------

    const ownedPermission = req.ability.findPermission(PermissionID.ROLE_EDIT);
    if (ownedPermission.target) {
        data.target = ownedPermission.target;
    }

    // ----------------------------------------------

    const roleRepository = getRepository(RoleEntity);
    let role = await roleRepository.findOne(id);

    if (typeof role === 'undefined') {
        throw new NotFoundError();
    }

    role = roleRepository.merge(role, data);

    const result = await roleRepository.save(role);

    return res.respondAccepted({
        data: result,
    });
}
