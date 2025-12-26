/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotEntity } from '../../../../../database/domains/index.ts';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../../../../../../services/index.ts';
import {
    useRequestIdentity, useRequestParamID, useRequestPermissionChecker,
} from '../../../../request/index.ts';

export async function deleteRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const permissionChecker = useRequestPermissionChecker(req);
    const identity = useRequestIdentity(req);
    if (
        !entity.user_id ||
        !identity ||
        identity.type !== 'user' ||
        entity.user_id !== identity.id
    ) {
        await permissionChecker.check({
            name: PermissionName.ROBOT_DELETE,
            input: {
                attributes: entity,
            },
        });
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // ----------------------------------------------

    // todo: this should be executed through a message broker
    if (isRobotSynchronizationServiceUsable()) {
        const robotSynchronizationService = useRobotSynchronizationService();
        await robotSynchronizationService.remove(entity);
    }

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
