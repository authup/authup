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
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runClientValidation } from './utils';
import { hashPassword } from '../../../../utils';
import { RobotEntity } from '../../../../domains';

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

    entity.secret = entity.secret || createNanoID(undefined, 36);
    entity.realm_id = req.realmId;

    await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
