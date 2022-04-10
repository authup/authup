/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import {
    PermissionID,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runOauth2ProviderRoleValidation } from '../utils';
import { OAuth2ProviderRoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ProviderRoleValidation(req, CRUDOperation.CREATE);
    if (!result.data) {
        return res.respondAccepted();
    }

    const repository = getRepository(OAuth2ProviderRoleEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
