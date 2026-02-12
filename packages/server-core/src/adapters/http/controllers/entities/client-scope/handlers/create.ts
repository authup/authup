/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { ClientScopeEntity } from '../../../../../database/domains/index.ts';
import { ClientScopeRequestValidator } from '../utils/index.ts';
import { RequestHandlerOperation, useRequestPermissionChecker } from '../../../../request/index.ts';

export async function createClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({
        name: PermissionName.CLIENT_SCOPE_CREATE,
    });

    const validator = new ClientScopeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);

    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: ClientScopeEntity,
    });

    if (data.client) {
        data.client_realm_id = data.client.realm_id;
    }

    if (data.scope) {
        data.scope_realm_id = data.scope.realm_id;
    }

    await permissionChecker.check({
        name: PermissionName.CLIENT_SCOPE_CREATE,
        input: new PolicyData({
            [BuiltInPolicyType.ATTRIBUTES]: data,
        }),
    });

    const repository = dataSource.getRepository(ClientScopeEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
