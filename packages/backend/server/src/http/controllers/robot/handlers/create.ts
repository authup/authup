/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    PermissionID, Robot,
    createNanoID,
} from '@typescript-auth/domains';
import { hash } from '@typescript-auth/server-utils';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import { RobotEntity, useRobotEventEmitter } from '../../../../domains';

export async function createRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const data = await runClientValidation(req, 'create');

    if (!req.ability.hasPermission(PermissionID.ROBOT_ADD)) {
        data.user_id = req.userId;
    } else if (
        data.user_id &&
        data.user_id !== req.userId
    ) {
        data.user_id = req.userId;
    }

    const repository = getRepository<Robot>(RobotEntity);
    const entity = repository.create(data);

    const secret = entity.secret || createNanoID(undefined, 64);
    entity.secret = await hash(secret);
    entity.realm_id = req.realmId;

    await repository.save(entity);

    entity.secret = secret; // expose secret one time ;)

    useRobotEventEmitter()
        .emit('credentials', {
            ...entity,
            secret,
        });

    useRobotEventEmitter()
        .emit('created', {
            ...entity,
        });

    return res.respondCreated({
        data: entity,
    });
}
