import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { matchedData, validationResult } from 'express-validator';
import { PermissionID, Realm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import { runRealmValidation } from '../utils/validation';
import { RealmEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function updateRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.REALM_EDIT)) {
        throw new ForbiddenError('You are not permitted to edit a realm.');
    }

    await runRealmValidation(req, CRUDOperation.UPDATE);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });
    if (!data) {
        return res.respondAccepted();
    }

    const repository = getRepository(RealmEntity);

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
