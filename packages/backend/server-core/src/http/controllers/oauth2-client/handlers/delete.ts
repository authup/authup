/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ClientEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function deleteOauth2ClientRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.has(PermissionID.CLIENT_DROP)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
