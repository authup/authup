/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import {
    PermissionID,
    isPermittedForResourceRealm,
} from '@authelion/common';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import {
    RealmEntity, RobotRepository, useRobotEventEmitter,
} from '../../../../domains';

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

    const repository = getCustomRepository<RobotRepository>(RobotRepository);
    const { entity, secret } = await repository.createWithSecret(data);

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

    entity.secret = secret;

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
