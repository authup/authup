import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { matchedData, validationResult } from 'express-validator';
import { PermissionID, Realm, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import { runUserAttributeValidation } from './utils';
import { RealmEntity, UserAttributeEntity } from '../../../../domains';

export async function updateUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const result = await runUserAttributeValidation(req, 'create');
    if (!result) {
        return res.respondAccepted();
    }

    const repository = getRepository(UserAttributeEntity);

    let entity = await repository.findOne(id);
    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, result.data);

    if (
        entity.user_id !== req.userId
    ) {
        if (
            !req.ability.hasPermission(PermissionID.USER_EDIT) ||
            !isPermittedForResourceRealm(req.realmId, entity.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to update an attribute for the given user...');
        }
    }

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
