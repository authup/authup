/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserAttributeEntity } from '../../../../domains';

export async function deleteUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(UserAttributeEntity);

    const entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        entity.user_id !== req.userId
    ) {
        if (
            !req.ability.hasPermission(PermissionID.USER_EDIT) ||
            !isPermittedForResourceRealm(req.realmId, entity.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to drop an attribute for the given user...');
        }
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
