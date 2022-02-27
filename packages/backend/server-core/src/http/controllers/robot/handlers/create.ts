/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import {
    PermissionID, Robot,
    createNanoID, isPermittedForResourceRealm,
} from '@typescript-auth/domains';
import { hash } from '@typescript-auth/server-utils';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import { RealmEntity, RobotEntity, useRobotEventEmitter } from '../../../../domains';

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

    const realmRepository = getRepository(RealmEntity);
    entity.realm_id = entity.realm_id || req.realmId;
    const realm = await realmRepository.findOne(entity.realm_id);

    if (typeof realm === 'undefined') {
        throw new NotFoundError('The referenced realm could not be found.');
    }

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError(`You are not allowed to add robots to the realm ${entity.realm_id}`);
    }

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
