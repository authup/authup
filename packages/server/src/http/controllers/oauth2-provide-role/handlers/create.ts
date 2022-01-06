/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { matchedData, validationResult } from 'express-validator';
import {
    OAuth2ProviderRole, PermissionID,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';
import { runOauth2ProviderRoleValidation } from './utils';

export async function createOauth2ProviderRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    await runOauth2ProviderRoleValidation(req, 'create');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<OAuth2ProviderRole> = matchedData(req, { includeOptionals: true });
    if (!data) {
        return res.respondAccepted();
    }

    const repository = getRepository(OAuth2ProviderRole);

    const entity = repository.create(data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
