/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { matchedData, validationResult } from 'express-validator';
import { OAuth2Provider, OAuth2ProviderRole, PermissionID } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';
import { runOauth2ProviderRoleValidation } from './utils';
import { OAuth2ProviderRoleEntity } from '../../../../domains';

export async function updateOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    await runOauth2ProviderRoleValidation(req, 'update');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<OAuth2ProviderRole> = matchedData(req, { includeOptionals: true });
    if (!data) {
        return res.respondAccepted();
    }

    const repository = getRepository(OAuth2ProviderRoleEntity);

    let provider = await repository.findOne(id);
    if (typeof provider === 'undefined') {
        throw new NotFoundError();
    }

    provider = repository.merge(provider, data);

    await repository.save(provider);

    return res.respond({
        data: provider,
    });
}
