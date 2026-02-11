/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { ForbiddenError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { ClientRoleEntity } from '../../../../../database/domains/index.ts';
import { IdentityPermissionService } from '../../../../../../services/index.ts';
import { ClientRoleRequestValidator } from '../utils/index.ts';
import {
    RequestHandlerOperation, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../../request/index.ts';

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

    const policyData = new PolicyData();
    policyData.set(BuiltInPolicyType.ATTRIBUTES, data);

    // ----------------------------------------------

    if (data.role) {
        data.role_realm_id = data.role.realm_id;

        const identity = useRequestIdentityOrFail(req);
        const identityPermissionService = new IdentityPermissionService(dataSource);
        const hasPermissions = await identityPermissionService.isSuperset(identity, {
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
        input: policyData,
    });

    // ----------------------------------------------

    const repository = dataSource.getRepository(ClientRoleEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
