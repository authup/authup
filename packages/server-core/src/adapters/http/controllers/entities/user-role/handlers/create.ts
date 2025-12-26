/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserRoleEntity } from '../../../../../database/domains/index.ts';
import { IdentityPermissionService } from '../../../../../../services/index.ts';
import { UserRoleRequestValidator } from '../utils/index.ts';
import {
    RequestHandlerOperation, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../../request/index.ts';

export async function createUserRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.USER_ROLE_CREATE });

    const validator = new UserRoleRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserRoleEntity,
    });

    // ----------------------------------------------

    if (data.role) {
        data.role_realm_id = data.role.realm_id;

        const identity = useRequestIdentityOrFail(req);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        const hasPermissions = await identityPermissionService.isSuperset(identity, {
            type: 'role',
            id: data.role_id,
            clientId: data.role.client_id,
        });
        if (!hasPermissions) {
            throw new ForbiddenError('You don\'t own the required permissions.');
        }
    }

    // ----------------------------------------------

    if (data.user) {
        data.user_realm_id = data.user.realm_id;
    }

    // ----------------------------------------------

    await permissionChecker.check({
        name: PermissionName.USER_ROLE_CREATE,
        input: {
            attributes: data,
        },
    });

    // ----------------------------------------------

    const repository = dataSource.getRepository(UserRoleEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
