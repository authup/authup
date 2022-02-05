import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { matchedData, validationResult } from 'express-validator';
import { PermissionID, Realm } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import { runRealmValidation } from './utils';
import { RealmEntity } from '../../../../domains';

export async function updateRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.REALM_EDIT)) {
        throw new ForbiddenError('You are not permitted to edit a realm.');
    }

    await runRealmValidation(req, 'update');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });
    if (!data) {
        return res.respondAccepted();
    }

    const realmRepository = getRepository(RealmEntity);

    let realm = await realmRepository.findOne(id);
    if (typeof realm === 'undefined') {
        throw new NotFoundError();
    }

    realm = realmRepository.merge(realm, data);

    await realmRepository.save(realm);

    return res.respond({
        data: realm,
    });
}
