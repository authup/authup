/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserPermissionEntity } from '../../../../../database/domains/index.ts';
import { UserPermissionRequestValidator } from '../utils/index.ts';
import { RequestHandlerOperation, useRequestPermissionChecker } from '../../../../request/index.ts';

/**
 * Add a permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createUserPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.USER_PERMISSION_CREATE });

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

    // ----------------------------------------------

    if (data.permission) {
        data.permission_realm_id = data.permission.realm_id;

        await permissionChecker.preCheck({
            name: data.permission.name,
        });
    }

    // ----------------------------------------------

    if (data.user) {
        data.user_realm_id = data.user.realm_id;
    }

    // ----------------------------------------------

    await permissionChecker.check({
        name: PermissionName.USER_PERMISSION_CREATE,
        input: {
            attributes: data,
        },
    });

    // ----------------------------------------------

    const repository = dataSource.getRepository(UserPermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
