import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { PermissionID, Role } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRoleValidation } from './utils';

export async function updateRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_EDIT)) {
        throw new NotFoundError();
    }

    const data = await runRoleValidation(req, 'update');
    if (!data) {
        return res.respondAccepted();
    }

    const roleRepository = getRepository(Role);
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
