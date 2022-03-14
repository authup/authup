import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID, Realm, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRoleAttributeValidation } from './utils';
import { RoleAttributeEntity } from '../../../../domains';

export async function updateRoleAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const result = await runRoleAttributeValidation(req, 'create');
    if (!result) {
        return res.respondAccepted();
    }

    const repository = getRepository(RoleAttributeEntity);

    let entity = await repository.findOne(id);
    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, result.data);

    if (
        !req.ability.hasPermission(PermissionID.ROLE_EDIT) ||
        !isPermittedForResourceRealm(req.realmId, entity.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to update an attribute for this role...');
    }

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
