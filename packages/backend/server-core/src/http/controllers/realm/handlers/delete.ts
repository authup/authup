/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID, Realm } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RealmEntity } from '../../../../domains';

export async function deleteRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.REALM_DROP)) {
        throw new ForbiddenError('You are not allowed to drop a realm.');
    }

    const repository = getRepository(RealmEntity);

    const entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (!entity.drop_able) {
        throw new BadRequestError('The realm can not be deleted in general.');
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
