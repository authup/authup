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

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const user = await userRepository.findOne(id);

    if (typeof user === 'undefined') {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, user.realm_id)) {
        throw new ForbiddenError(`You are not authorized to drop a user fo the realm ${user.realm_id}`);
    }

    await userRepository.remove(user);

    return res.respondDeleted();
}
