/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import {
    RobotRepository,
    saveRobotCredentialsToVault,
} from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runRobotValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const result = await runRobotValidation(req, RequestHandlerOperation.CREATE);

    const ability = useRequestEnv(req, 'abilities');
    const userId = useRequestEnv(req, 'userId');

    if (!ability.has(PermissionName.ROBOT_ADD)) {
        result.data.user_id = userId;
    } else if (
        result.data.user_id &&
        result.data.user_id !== userId
    ) {
        result.data.user_id = userId;
    }

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    const { entity, secret } = await repository.createWithSecret(result.data);

    await repository.save(entity);

    entity.secret = secret;

    // ----------------------------------------------

    // todo: this should be executed through a message broker
    await saveRobotCredentialsToVault({
        ...entity,
        secret,
    });

    // ----------------------------------------------

    return sendCreated(res, entity);
}
