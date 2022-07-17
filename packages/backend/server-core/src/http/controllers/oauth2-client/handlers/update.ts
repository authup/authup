/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runOauth2ClientValidation } from '../utils';
import { OAuth2ClientEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function updateOauth2ClientRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.has(PermissionID.CLIENT_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ClientValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return res.respondAccepted();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
