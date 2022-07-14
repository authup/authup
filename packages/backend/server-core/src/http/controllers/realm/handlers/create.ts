/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import { matchedData, validationResult } from 'express-validator';
import {
    PermissionID, Realm,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import { runRealmValidation } from '../utils';
import { RealmEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function createRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.has(PermissionID.REALM_ADD)) {
        throw new ForbiddenError('You are not permitted to add a realm.');
    }

    await runRealmValidation(req, CRUDOperation.CREATE);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });
    if (!data) {
        return res.respondAccepted();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = repository.create(data);

    await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
