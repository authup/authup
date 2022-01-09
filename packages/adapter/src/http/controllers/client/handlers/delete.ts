import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import {
    Client, PermissionID,
} from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';

export async function deleteClientRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(Client);
    const entity = await repository.findOne(id);

    if (!req.ability.hasPermission(PermissionID.CLIENT_DROP)) {
        if (!entity.user_id) {
            throw new ForbiddenError();
        }

        if (
            entity.user_id &&
            entity.user_id !== req.userId
        ) {
            throw new ForbiddenError();
        }
    }

    await repository.remove(entity);

    return res.respondDeleted();
}
