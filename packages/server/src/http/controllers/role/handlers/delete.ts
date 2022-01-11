import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { PermissionID } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RoleEntity } from '../../../../domains';

export async function deleteRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_DROP)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(RoleEntity);
    const entity = await repository.findOne(id);

    await repository.remove(entity);

    return res.respondDeleted();
}
