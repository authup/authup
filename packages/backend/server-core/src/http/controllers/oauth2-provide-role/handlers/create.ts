/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import {
    PermissionID,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runOauth2ProviderRoleValidation } from '../utils';
import { OAuth2ProviderRoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function createOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.has(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ProviderRoleValidation(req, CRUDOperation.CREATE);
    if (!result.data) {
        return res.respondAccepted();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ProviderRoleEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
