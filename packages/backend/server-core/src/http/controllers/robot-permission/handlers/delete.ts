import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotPermissionEntity } from '../../../../domains';

/**
 * Drop an permission by id of a specific user.
 *
 * @param req
 * @param res
 */
export async function deleteRobotPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROBOT_PERMISSION_DROP)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(RobotPermissionEntity);
    const entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
