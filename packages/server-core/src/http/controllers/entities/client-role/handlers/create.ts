/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyInput } from '@authup/access';
import { ForbiddenError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { ClientRoleEntity } from '../../../../../database/domains';
import { IdentityPermissionService } from '../../../../../services';
import { ClientRoleRequestValidator } from '../utils';
import {
    RequestHandlerOperation, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../../request';

export async function createClientRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.CLIENT_ROLE_CREATE });

    const validator = new ClientRoleRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: ClientRoleEntity,
    });

    // ----------------------------------------------

    const policyInput : PolicyInput = {
        attributes: data satisfies Partial<ClientRoleEntity>,
    };

    // ----------------------------------------------

    if (data.role) {
        data.role_realm_id = data.role.realm_id;

        const identity = useRequestIdentityOrFail(req);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        const hasPermissions = await identityPermissionService.hasSuperset(identity, {
            type: 'role',
            id: data.role.id,
            clientId: data.role.client_id,
        });
        if (!hasPermissions) {
            throw new ForbiddenError('You don\'t own the required permissions.');
        }
    }

    // ----------------------------------------------

    if (data.client) {
        data.client_realm_id = data.client.realm_id;
    }

    // ----------------------------------------------

    await permissionChecker.check({
        name: PermissionName.CLIENT_ROLE_CREATE,
        input: policyInput,
    });

    // ----------------------------------------------

    const repository = dataSource.getRepository(ClientRoleEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
