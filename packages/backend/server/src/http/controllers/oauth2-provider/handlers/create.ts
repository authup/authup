/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { validationResult } from 'express-validator';
import { getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError } from '@typescript-error/http';
import {
    MASTER_REALM_ID, OAuth2Provider, PermissionID, Realm,
} from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { runOauth2ProviderValidation } from './utils';
import { OAuth2ProviderEntity, RealmEntity } from '../../../../domains';

export async function createOauth2ProviderRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.PROVIDER_ADD)) {
        throw new ForbiddenError();
    }

    await runOauth2ProviderValidation(req, 'create');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<OAuth2Provider> = matchedValidationData(req, { includeOptionals: true });
    if (!data) {
        return res.respondAccepted();
    }

    if (data.realm_id) {
        const realmRepository = getRepository(RealmEntity);
        const realm = await realmRepository.findOne(data.realm_id);

        if (typeof realm === 'undefined') {
            throw new BadRequestError('The referenced realm does not exist');
        }

        if (
            req.realmId !== data.realm_id &&
            req.realmId !== MASTER_REALM_ID
        ) {
            throw new ForbiddenError('You are not permitted to the create an authentication provider for that realm.');
        }
    }

    const repository = getRepository(OAuth2ProviderEntity);

    const provider = repository.create(data);

    await repository.save(provider);

    return res.respond({
        data: provider,
    });
}
