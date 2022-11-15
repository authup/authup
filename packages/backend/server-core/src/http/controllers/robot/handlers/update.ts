/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionID } from '@authelion/common';
import {
    Request, Response, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils';
import { runRobotValidation } from '../utils';
import { RobotRepository, useRobotEventEmitter } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function updateRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const result = await runRobotValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.ROBOT_EDIT)) {
        if (!entity.user_id) {
            throw new ForbiddenError();
        }

        if (
            entity.user_id &&
            entity.user_id !== useRequestEnv(req, 'userId')
        ) {
            throw new ForbiddenError();
        }
    }

    entity = repository.merge(entity, result.data);

    if (result.data.secret) {
        entity.secret = await repository.hashSecret(result.data.secret);
    }

    entity = await repository.save(entity);

    // ----------------------------------------------

    useRobotEventEmitter()
        .emit('updated', {
            ...entity,
        });

    if (result.data.secret) {
        useRobotEventEmitter()
            .emit('credentials', {
                ...entity,
                secret: result.data.secret,
            });

        entity.secret = result.data.secret;
    }

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
