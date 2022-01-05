import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { Oauth2ProviderRole, PermissionID } from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function deleteOauth2ProvideRoleRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(Oauth2ProviderRole);
    const entity = await repository.findOne(id);
    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    await repository.remove(entity);

    return res.respondDeleted();
}
