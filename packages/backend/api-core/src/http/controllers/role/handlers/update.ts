import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runRoleValidation } from '../utils/validaiton';
import { RoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function updateRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_EDIT)) {
        throw new NotFoundError();
    }

    const result = await runRoleValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return res.respondAccepted();
    }

    // ----------------------------------------------

    const repository = getRepository(RoleEntity);
    let entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const ownedPermission = req.ability.findPermission(PermissionID.ROLE_EDIT);
    if (ownedPermission.target !== entity.target) {
        throw new ForbiddenError('You are not permitted for the role target.');
    }

    // ----------------------------------------------

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return res.respondAccepted({
        data: entity,
    });
}
