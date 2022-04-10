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
import { runOauth2ProviderValidation } from '../utils';
import { OAuth2ProviderEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createOauth2ProviderRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.PROVIDER_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ProviderValidation(req, CRUDOperation.CREATE);

    const repository = getRepository(OAuth2ProviderEntity);

    const provider = repository.create(result.data);

    await repository.save(provider);

    return res.respond({
        data: provider,
    });
}
