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
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { ClientScopeRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createClientScopeRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.CLIENT_UPDATE)) {
        throw new NotFoundError();
    }

    const validator = new ClientScopeRequestValidator();

    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (data.client) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.client.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('client_id'));
        }

        data.client_realm_id = data.client.realm_id;
    }

    if (data.scope) {
        data.scope_realm_id = data.scope.realm_id;
    }

    if (!ability.can(PermissionName.CLIENT_UPDATE, { attributes: data })) {
        throw new NotFoundError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientScopeEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
