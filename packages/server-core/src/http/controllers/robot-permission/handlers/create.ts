/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '@authup/permitus';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import {
    RobotPermissionEntity,
} from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RequestHandlerOperation, useRequestEnv } from '../../../request';
import { RobotPermissionRequestValidator } from '../utils';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRobotPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!await abilities.has(PermissionName.ROBOT_PERMISSION_CREATE)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const validator = new RobotPermissionRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RobotPermissionEntity,
    });

    const policyEvaluationContext : PolicyData = {
        attributes: data satisfies Partial<RobotPermissionEntity>,
    };

    // ----------------------------------------------

    if (data.permission) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.permission.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('permission_id'));
        }

        data.permission_realm_id = data.permission.realm_id;

        // todo: pass realm id
        if (!await abilities.safeCheck(data.permission.name, policyEvaluationContext)) {
            throw new ForbiddenError('The target permission is not owned.');
        }
    }

    // ----------------------------------------------

    if (data.robot) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.robot.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }

        data.robot_realm_id = data.robot.realm_id;
    }

    // ----------------------------------------------

    if (!await abilities.safeCheck(PermissionName.ROBOT_PERMISSION_CREATE, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(RobotPermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
