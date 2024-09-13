/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { RobotRoleEntity } from '../../../../domains';
import { IdentityPermissionService } from '../../../../services';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RobotRoleRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestEnv } from '../../../request';

export async function createRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheck({ name: PermissionName.ROBOT_ROLE_CREATE });

    const validator = new RobotRoleRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RobotRoleEntity,
    });

    // ----------------------------------------------

    const policyEvaluationContext : PolicyData = {
        attributes: data satisfies Partial<RobotRoleEntity>,
    };

    // ----------------------------------------------

    if (data.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.role.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('role_id'));
        }

        data.role_realm_id = data.role.realm_id;

        const identity = permissionChecker.getRequestIdentity();
        if (!identity) {
            throw new ForbiddenError('You don\'t own the required permissions.');
        }

        const identityPermissionService = new IdentityPermissionService(dataSource);
        const hasPermissions = await identityPermissionService.hasSuperset(identity, {
            type: 'role',
            id: data.role_id,
        });
        if (!hasPermissions) {
            throw new ForbiddenError('You don\'t own the required permissions.');
        }
    }

    // ----------------------------------------------

    if (data.robot) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.robot.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('robot_id'));
        }

        data.robot_realm_id = data.robot.realm_id;
    }

    // ----------------------------------------------

    await permissionChecker.check({ name: PermissionName.ROBOT_ROLE_CREATE, data: policyEvaluationContext });

    // ----------------------------------------------

    const repository = dataSource.getRepository(RobotRoleEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
