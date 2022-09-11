/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionID,
} from '@authelion/common';
import { useDataSource } from 'typeorm-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRobotValidation } from '../utils';
import {
    RobotRepository, useRobotEventEmitter,
} from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const result = await runRobotValidation(req, CRUDOperation.CREATE);

    if (!req.ability.has(PermissionID.ROBOT_ADD)) {
        result.data.user_id = req.userId;
    } else if (
        result.data.user_id &&
        result.data.user_id !== req.userId
    ) {
        result.data.user_id = req.userId;
    }

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    const { entity, secret } = await repository.createWithSecret(result.data);

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
