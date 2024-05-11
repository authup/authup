/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils/env';
import { runRoleValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request/constants';

export async function createRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.ROLE_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runRoleValidation(req, RequestHandlerOperation.CREATE);

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleEntity);
    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
