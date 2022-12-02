/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import { PermissionID } from '@authelion/common';
import { Request, Response, sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import {
    RolePermissionEntity,
} from '@authelion/server-database';
import { useRequestEnv } from '../../../utils/env';
import { runRolePermissionValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRolePermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.ROLE_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const result = await runRolePermissionValidation(req, CRUDOperation.CREATE);

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RolePermissionEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
