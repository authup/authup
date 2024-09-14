/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { ClientScopeEntity } from '../../../../domains';
import { ClientScopeRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestEnv } from '../../../request';

export async function createClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheck({
        name: PermissionName.CLIENT_UPDATE,
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

    // todo: should be dedicated permission
    await permissionChecker.check({
        name: PermissionName.CLIENT_CREATE,
        data: {
            attributes: data,
        },
    });

    const repository = dataSource.getRepository(ClientScopeEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
