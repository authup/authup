/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import {
    PermissionName, REALM_MASTER_NAME, ROBOT_SYSTEM_NAME, isPropertySet,
} from '@authup/common';
import {
    Request, Response, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotRepository, useRobotEventEmitter } from '@authup/server-database';
import { findRealm } from '../../../helpers';
import { useRequestEnv } from '../../../utils';
import { runRobotValidation } from '../utils';
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
    if (!ability.has(PermissionName.ROBOT_EDIT)) {
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

    if (
        isPropertySet(result.data, 'name') &&
        entity.name !== result.data.name &&
        entity.name === ROBOT_SYSTEM_NAME
    ) {
        const realm = await findRealm(entity.realm_id);
        if (realm.name === REALM_MASTER_NAME) {
            throw new BadRequestError('The system robot name can not be changed.');
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
