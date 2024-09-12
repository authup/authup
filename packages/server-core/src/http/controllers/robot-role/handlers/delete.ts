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
import { RobotRoleEntity } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function deleteRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheck({ name: PermissionName.ROBOT_ROLE_DELETE });

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RobotRoleEntity);

    const entity = await repository.findOne({
        where: {
            id,
        },
        relations: {
            robot: true,
            role: true,
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.robot_realm_id) ||
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.role_realm_id)
    ) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    await permissionChecker.check({ name: PermissionName.ROBOT_ROLE_DELETE, data: { attributes: entity } });

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
