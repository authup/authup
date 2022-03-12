/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { validationResult } from 'express-validator';
import { OAuth2Provider, PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { runOauth2ProviderValidation } from './utils';
import { OAuth2ProviderEntity } from '../../../../domains';

export async function updateOauth2ProviderRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    await runOauth2ProviderValidation(req, 'update');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<OAuth2Provider> = matchedValidationData(req, { includeOptionals: true });
    if (!data) {
        return res.respondAccepted();
    }

    const repository = getRepository(OAuth2ProviderEntity);

    let entity = await repository.findOne(id);
    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
