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
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { RolePermissionRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRolePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!await abilities.has(PermissionName.ROLE_PERMISSION_CREATE)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const validator = new RolePermissionRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const policyEvaluationContext : PolicyEvaluationContext = {
        attributes: data satisfies Partial<RolePermissionEntity>,
    };

    // ----------------------------------------------

    if (data.permission) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.permission.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('permission_id'));
        }

        data.permission_realm_id = data.permission.realm_id;

        if (!data.role || data.role.name !== ROLE_ADMIN_NAME) {
            const ability = buildAbilityFromPermission(data.permission);
            if (!await abilities.can(ability, policyEvaluationContext)) {
                throw new ForbiddenError('The target permission is not owned.');
            }
        }
    }

    // ----------------------------------------------

    if (data.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.role.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('role_id'));
        }

        data.role_realm_id = data.role.realm_id;
    }

    // ----------------------------------------------

    if (!await abilities.can(PermissionName.USER_ROLE_CREATE, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RolePermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
