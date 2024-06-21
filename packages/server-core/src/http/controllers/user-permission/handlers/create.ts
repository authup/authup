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
import { UserPermissionRequestValidator } from '../utils';
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

    const validator = new UserPermissionRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const policyEvaluationContext : PolicyEvaluationContext = {
        resource: data satisfies Partial<UserPermissionEntity>,
    };

    // ----------------------------------------------

    if (data.permission) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.permission.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('permission_id'));
        }

        data.permission_realm_id = data.permission.realm_id;

        const ability = buildAbilityFromPermission(data.permission);
        if (!abilities.has(ability, policyEvaluationContext)) {
            throw new ForbiddenError('The target permission is not owned.');
        }
    }

    // ----------------------------------------------

    if (data.user) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.user.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('user_id'));
        }

        data.user_realm_id = data.user.realm_id;
    }

    // ----------------------------------------------

    if (!abilities.has(PermissionName.USER_PERMISSION_ADD, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserPermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
