import { getCustomRepository } from 'typeorm';
import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRepository } from '../../../../domains';

export async function deleteUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.USER_DROP)) {
        throw new ForbiddenError('You are not authorized to drop a user.');
    }

    if (req.user.id === id) {
        throw new BadRequestError('The own user can not be deleted.');
    }

    const repository = getCustomRepository<UserRepository>(UserRepository);
    const entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError(`You are not authorized to drop a user fo the realm ${entity.realm_id}`);
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
