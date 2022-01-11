import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, Robot } from '@typescript-auth/domains';
import { hashPassword } from '../../../../utils';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import { RobotEntity } from '../../../../domains';

export async function updateRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const data = await runClientValidation(req, 'update');
    if (!data) {
        return res.respondAccepted();
    }

    if (data.secret) {
        data.secret = await hashPassword(data.secret);
    }

    const repository = getRepository<Robot>(RobotEntity);
    let entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (!req.ability.hasPermission(PermissionID.ROBOT_EDIT)) {
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

    entity = repository.merge(entity, data);

    const result = await repository.save(entity);

    return res.respondAccepted({
        data: result,
    });
}
