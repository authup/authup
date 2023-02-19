/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/common';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ScopeEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils';
import { runScopeValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request/constants';

export async function createScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionName.SCOPE_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runScopeValidation(req, RequestHandlerOperation.CREATE);

    // ----------------------------------------------

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ScopeEntity);
    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
