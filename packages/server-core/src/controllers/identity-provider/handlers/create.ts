/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionID,
} from '@authelion/common';
import {
    Request, Response, send, sendCreated,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils/env';
import { runOauth2ProviderValidation } from '../utils';
import { IdentityProviderRepository } from '@authelion/server-database';
import { CRUDOperation } from '../../../constants';

export async function createIdentityProviderRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.PROVIDER_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ProviderValidation(req, CRUDOperation.CREATE);

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const entity = repository.create(result.data);

    await repository.save(entity);

    await repository.saveAttributes(entity.id, result.meta.attributes);
    repository.appendAttributes(entity, result.meta.attributes);

    return sendCreated(res, entity);
}
