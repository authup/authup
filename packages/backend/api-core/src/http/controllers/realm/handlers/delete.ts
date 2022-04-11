/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RealmEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function deleteRealmRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.REALM_DROP)) {
        throw new ForbiddenError('You are not allowed to drop a realm.');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = await repository.findOneBy({ id });

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
