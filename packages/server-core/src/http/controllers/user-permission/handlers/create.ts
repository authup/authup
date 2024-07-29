/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/permitus';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName, isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserPermissionEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
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
    if (!await abilities.has(PermissionName.USER_PERMISSION_CREATE)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const validator = new UserPermissionRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserPermissionEntity,
    });

    const policyEvaluationContext : PolicyEvaluationContext = {
        attributes: data satisfies Partial<UserPermissionEntity>,
    };

    // ----------------------------------------------

    if (data.permission) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.permission.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('permission_id'));
        }

        data.permission_realm_id = data.permission.realm_id;
        // todo: pass realm id
        if (!await abilities.can(data.permission.name, policyEvaluationContext)) {
            throw new ForbiddenError('The target permission is not owned.');
        }
    }

    // ----------------------------------------------

    if (data.user) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.user.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }

        data.user_realm_id = data.user.realm_id;
    }

    // ----------------------------------------------

    if (!await abilities.can(PermissionName.USER_PERMISSION_CREATE, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(UserPermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
