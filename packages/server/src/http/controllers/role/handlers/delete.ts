import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { OAuth2Provider, PermissionID, Role } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function deleteRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_DROP)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(Role);
    const entity = await repository.findOne(id);

    await repository.remove(entity);

    return res.respondDeleted();
}
