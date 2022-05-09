/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID } from '@authelion/common';
import { buildKeyPath } from 'redis-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRobotValidation } from '../utils';
import { RobotRepository, useRobotEventEmitter } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';
import { CachePrefix } from '../../../../redis/constants';

export async function updateRobotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const result = await runRobotValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return res.respondAccepted();
    }

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    let entity = await repository.findOneBy({ id });

    if (!entity) {
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

    if (dataSource.queryResultCache) {
        await dataSource.queryResultCache.remove([
            buildKeyPath({
                prefix: CachePrefix.ROBOT,
                id: entity.id,
            }),
        ]);
    }

    // ----------------------------------------------

    return res.respondAccepted({
        data: entity,
    });
}
