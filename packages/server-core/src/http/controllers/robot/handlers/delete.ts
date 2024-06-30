/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    REALM_MASTER_NAME,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { RobotEntity, removeRobotCredentialsFromVault, resolveRealm } from '../../../../domains';
import { useRequestIDParam } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function deleteRobotRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const ability = useRequestEnv(req, 'abilities');
    const userId = useRequestEnv(req, 'userId');
    if (!entity.user_id || !userId || entity.user_id !== userId) {
        if (!ability.can(PermissionName.ROBOT_DELETE, { attributes: entity })) {
            throw new ForbiddenError();
        }
    }

    const config = useConfig();
    if (entity.name.toLowerCase() === config.robotAdminName.toLowerCase()) {
        const realm = await resolveRealm(entity.realm_id);
        if (realm.name === REALM_MASTER_NAME) {
            throw new BadRequestError('The system robot can not be deleted.');
        }
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // ----------------------------------------------

    // todo: this should be executed through a message broker
    await removeRobotCredentialsFromVault(entity);

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
