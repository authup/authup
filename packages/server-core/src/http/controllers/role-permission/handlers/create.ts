/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName, ROLE_ADMIN_NAME, buildAbilityFromPermission, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import {
    RolePermissionEntity,
} from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { runRolePermissionValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRolePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!abilities.has(PermissionName.ROLE_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const result = await runRolePermissionValidation(req, RequestHandlerOperation.CREATE);

    const policyEvaluationContext : PolicyEvaluationContext = {
        resource: {
            ...result.data,
            role: result.relation.role,
            permission: result.relation.permission,
        } satisfies Partial<RolePermissionEntity>,
    };

    // ----------------------------------------------

    if (result.relation.permission) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.permission.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('permission_id'));
        }

        result.data.permission_realm_id = result.relation.permission.realm_id;

        if (!result.relation.role || result.relation.role.name !== ROLE_ADMIN_NAME) {
            const ability = buildAbilityFromPermission(result.relation.permission);
            if (!abilities.has(ability, policyEvaluationContext)) {
                throw new ForbiddenError('The target permission is not owned.');
            }
        }
    }

    // ----------------------------------------------

    if (result.relation.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.role.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('role_id'));
        }

        result.data.role_realm_id = result.relation.role.realm_id;
    }

    // ----------------------------------------------

    if (!abilities.has(PermissionName.USER_ROLE_ADD, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RolePermissionEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
