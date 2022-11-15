/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import {
    Request, Response, send, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils';
import { runOauth2ProviderValidation } from '../utils';
import { IdentityProviderRepository } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function updateIdentityProviderRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ProviderValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    await repository.saveAttributes(entity.id, result.meta.attributes);
    await repository.extendEntity(entity);

    return send(res, entity);
}
