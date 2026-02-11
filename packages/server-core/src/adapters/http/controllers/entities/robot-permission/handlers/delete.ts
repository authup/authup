/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotPermissionEntity } from '../../../../../database/domains/index.ts';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request/index.ts';

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

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.ROBOT_PERMISSION_DELETE });

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

    await permissionChecker.check({
        name: PermissionName.ROBOT_PERMISSION_DELETE,
        input: new PolicyData({
            [BuiltInPolicyType.ATTRIBUTES]: entity,
        }),
    });

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // ----------------------------------------------

    return sendAccepted(res, entity);
}
