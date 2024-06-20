/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientScopeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { runClientScopeValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.CLIENT_EDIT)) {
        throw new NotFoundError();
    }

    const result = await runClientScopeValidation(req, RequestHandlerOperation.CREATE);

    if (result.relation.client) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), result.relation.client.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('client_id'));
        }

        result.data.client_realm_id = result.relation.client.realm_id;
    }

    if (result.relation.scope) {
        result.data.scope_realm_id = result.relation.scope.realm_id;
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    let entity = repository.create(result.data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
