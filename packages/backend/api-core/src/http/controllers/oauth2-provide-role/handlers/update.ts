/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import {
    PermissionID, isPermittedForResourceRealm,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runOauth2ProviderRoleValidation } from '../utils';
import { OAuth2ProviderRoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function updateOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ProviderRoleValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return res.respondAccepted();
    }

    const repository = getRepository(OAuth2ProviderRoleEntity);

    let entity = await repository.findOne(id);
    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        !isPermittedForResourceRealm(req.realmId, entity.provider_realm_id) ||
        !isPermittedForResourceRealm(req.realmId, entity.role_realm_id)
    ) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
