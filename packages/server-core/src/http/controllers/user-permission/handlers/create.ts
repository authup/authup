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
import { useDataSource } from 'typeorm-extension';
import { UserPermissionEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils/env';
import { runUserPermissionValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request/constants';

/**
 * Add a permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createUserPermissionRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.USER_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const result = await runUserPermissionValidation(req, RequestHandlerOperation.CREATE);

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserPermissionEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
