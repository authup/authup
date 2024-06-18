/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName, buildAbilityFromPermission, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserPermissionEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { runUserPermissionValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

/**
 * Add a permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createUserPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!abilities.has(PermissionName.USER_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const result = await runUserPermissionValidation(req, RequestHandlerOperation.CREATE);

    const policyEvaluationContext : PolicyEvaluationContext = {
        resource: {
            ...result.data,
            user: result.relation.user,
            permission: result.relation.permission,
        } satisfies Partial<UserPermissionEntity>,
    };

    // ----------------------------------------------

    if (result.relation.permission) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.permission.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('permission_id'));
        }

        result.data.permission_realm_id = result.relation.permission.realm_id;

        const ability = buildAbilityFromPermission(result.relation.permission);
        if (!abilities.has(ability, policyEvaluationContext)) {
            throw new ForbiddenError('The target permission is not owned.');
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

    if (!abilities.has(PermissionName.USER_PERMISSION_ADD, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserPermissionEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
