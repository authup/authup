/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/permitus';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName, ROLE_ADMIN_NAME, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
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
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: RolePermissionEntity,
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
            // todo: pass realm_id
            if (!await abilities.can(data.permission.name, policyEvaluationContext)) {
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

    const repository = dataSource.getRepository(RolePermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
