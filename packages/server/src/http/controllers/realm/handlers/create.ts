/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError } from '@typescript-error/http';
import { matchedData, validationResult } from 'express-validator';
import {
    PermissionID, Realm,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';
import { runRealmValidation } from './utils';

export async function createRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.REALM_ADD)) {
        throw new ForbiddenError('You are not permitted to add a realm.');
    }

    await runRealmValidation(req, 'create');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });
    if (!data) {
        return res.respondAccepted();
    }

    const realmRepository = getRepository(Realm);

    const realm = realmRepository.create(data);

    await realmRepository.save(realm);

    return res.respondCreated({
        data: realm,
    });
}
