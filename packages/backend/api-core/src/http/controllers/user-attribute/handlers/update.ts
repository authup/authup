/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserAttributeValidation } from '../utils';
import { UserAttributeEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function updateUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const result = await runUserAttributeValidation(req, CRUDOperation.UPDATE);
    if (!result) {
        return res.respondAccepted();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    let entity = await repository.findOneBy({ id });
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
