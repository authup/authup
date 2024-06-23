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
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { RobotRoleRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createRobotRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!abilities.has(PermissionName.ROBOT_ROLE_ADD)) {
        throw new NotFoundError();
    }

    const validator = new RobotRoleRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    // ----------------------------------------------

    const policyEvaluationContext : PolicyEvaluationContext = {
        resource: data satisfies Partial<RobotRoleEntity>,
    };

    // ----------------------------------------------

    const dataSource = await useDataSource();

    // ----------------------------------------------

    if (data.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.role.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('role_id'));
        }

        data.role_realm_id = data.role.realm_id;

        const roleRepository = new RoleRepository(dataSource);
        const roleAbilities = await roleRepository.getOwnedPermissions(data.role_id);
        if (!abilities.hasMany(roleAbilities, policyEvaluationContext)) {
            throw new ForbiddenError('The role permissions are not owned.');
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

    if (!abilities.has(PermissionName.ROBOT_ROLE_ADD, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(RobotRoleEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
