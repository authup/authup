/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RobotRoleEntity, RoleRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { runRobotRoleValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!abilities.has(PermissionName.ROBOT_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const result = await runRobotRoleValidation(req, RequestHandlerOperation.CREATE);
    // ----------------------------------------------

    const policyEvaluationContext : PolicyEvaluationContext = {
        resource: {
            ...result.data,
            robot: result.relation.robot,
            role: result.relation.role,
        } satisfies Partial<RobotRoleEntity>,
    };

    // ----------------------------------------------

    const dataSource = await useDataSource();

    // ----------------------------------------------

    if (result.relation.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.role.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.relation.role.realm_id;

        const roleRepository = new RoleRepository(dataSource);
        const roleAbilities = await roleRepository.getOwnedPermissions(result.data.role_id);
        if (!abilities.hasMany(roleAbilities, policyEvaluationContext)) {
            throw new ForbiddenError('The role permissions are not owned.');
        }
    }

    // ----------------------------------------------

    if (result.relation.robot) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.robot.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('robot_id'));
        }

        result.data.robot_realm_id = result.relation.robot.realm_id;
    }

    // ----------------------------------------------

    if (!abilities.has(PermissionName.ROBOT_ROLE_ADD, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(RobotRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
