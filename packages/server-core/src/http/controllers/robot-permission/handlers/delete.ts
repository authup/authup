/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotPermissionEntity } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

/**
 * Drop a permission by id of a specific user.
 *
 * @param req
 * @param res
 */
export async function deleteRobotPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req, {
        isUUID: false,
    });

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.ROBOT_PERMISSION_DELETE)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotPermissionEntity);
    const entity = await repository.findOne({
        where: {
            id,
        },
        relations: {
            robot: true,
            permission: true,
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.robot_realm_id)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    if (!await ability.can(PermissionName.ROBOT_PERMISSION_DELETE, { attributes: entity })) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
