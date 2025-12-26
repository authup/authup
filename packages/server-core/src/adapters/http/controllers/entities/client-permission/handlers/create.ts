/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyInput } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import {
    ClientPermissionEntity,
} from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation, useRequestPermissionChecker } from '../../../../request/index.ts';
import { ClientPermissionRequestValidator } from '../utils/index.ts';

/**
 * Add a permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createClientPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.CLIENT_PERMISSION_CREATE });

    // ----------------------------------------------

    const validator = new ClientPermissionRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: ClientPermissionEntity,
    });

    const policyData : PolicyInput = {
        attributes: data satisfies Partial<ClientPermissionEntity>,
    };

    // ----------------------------------------------

    if (data.permission) {
        data.permission_realm_id = data.permission.realm_id;

        await permissionChecker.preCheck({
            name: data.permission.name,
        });
    }

    // ----------------------------------------------

    if (data.client) {
        data.client_realm_id = data.client.realm_id;
    }

    // ----------------------------------------------

    await permissionChecker.check({
        name: PermissionName.CLIENT_PERMISSION_CREATE,
        input: policyData,
    });

    // ----------------------------------------------

    const repository = dataSource.getRepository(ClientPermissionEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
