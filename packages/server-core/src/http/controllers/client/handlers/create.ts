/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { ClientEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { ClientRequestValidator } from '../utils';
import { RequestHandlerOperation, isRequestMasterRealm } from '../../../request';

export async function createClientRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.CLIENT_CREATE)) {
        throw new ForbiddenError();
    }

    const validator = new ClientRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!data.realm_id && !isRequestMasterRealm(req)) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
    }

    if (!await ability.can(PermissionName.CLIENT_CREATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
    }

    await enforceUniquenessForDatabaseEntity(ClientEntity, data);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientEntity);

    data.user_id = useRequestEnv(req, 'userId');
    const provider = repository.create(data);

    await repository.save(provider);

    return sendCreated(res, provider);
}
