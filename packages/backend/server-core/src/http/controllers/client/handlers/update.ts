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
import { runOauth2ClientValidation } from '../utils';
import { OAuth2ClientEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function updateClientRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.CLIENT_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ClientValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return send(res, entity);
}
