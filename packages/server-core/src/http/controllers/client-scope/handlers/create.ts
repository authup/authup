/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientScopeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runClientScopeValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request/constants';

export async function createClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.CLIENT_EDIT)) {
        throw new NotFoundError();
    }

    const result = await runClientScopeValidation(req, RequestHandlerOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
