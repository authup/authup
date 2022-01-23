import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, Robot } from '@typescript-auth/domains';
import { hash } from '@typescript-auth/server-utils';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import { RobotEntity, useRobotEventEmitter } from '../../../../domains';

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
        entity.secret = await hash(data.secret);
    }

    entity = await repository.save(entity);

    if (data.secret) {
        useRobotEventEmitter()
            .emit('credentials', {
                ...entity,
                secret: data.secret,
            });

        entity.secret = data.secret; // expose secret one time ;)
    }

    return res.respondAccepted({
        data: entity,
    });
}
