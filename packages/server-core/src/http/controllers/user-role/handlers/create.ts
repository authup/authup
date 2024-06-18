/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RoleRepository, UserRoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { runUserRoleValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createUserRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!abilities.has(PermissionName.USER_ROLE_ADD)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();

    const result = await runUserRoleValidation(req, RequestHandlerOperation.CREATE);

    // ----------------------------------------------

    const policyEvaluationContext : PolicyEvaluationContext = {
        resource: {
            ...result.data,
            user: result.relation.user,
            role: result.relation.role,
        } satisfies Partial<UserRoleEntity>,
    };

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

    if (result.relation.user) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.user.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('user_id'));
        }

        result.data.user_realm_id = result.relation.user.realm_id;
    }

    // ----------------------------------------------

    if (!abilities.has(PermissionName.USER_ROLE_ADD, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(UserRoleEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
