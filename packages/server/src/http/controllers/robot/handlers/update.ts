import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, Robot } from '@typescript-auth/domains';
import { hashPassword } from '../../../../utils';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import { RobotEntity } from '../../../../domains';
import { useRobotEventEmitter } from '../../../../domains/robot/event';

export async function updateRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const data = await runClientValidation(req, 'update');
    if (!data) {
        return res.respondAccepted();
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

    if (data.secret) {
        entity.secret = await hashPassword(data.secret);
    }

    const result = await repository.save(entity);

    if (data.secret) {
        useRobotEventEmitter()
            .emit('credentials', {
                name: entity.name,
                id: entity.id,
                secret: data.secret,
            });
    }

    return res.respondAccepted({
        data: result,
    });
}
