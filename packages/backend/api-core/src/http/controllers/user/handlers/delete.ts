/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserRepository } from '../../../../domains';
import { useDataSource } from '../../../../database';

export async function deleteUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.USER_DROP)) {
        throw new ForbiddenError('You are not authorized to drop a user.');
    }

    if (req.user.id === id) {
        throw new BadRequestError('The own user can not be deleted.');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getCustomRepository<UserRepository>(UserRepository);
    const entity = await repository.findOneBy({ id });

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError(`You are not authorized to drop a user fo the realm ${entity.realm_id}`);
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return res.respondDeleted({
        data: entity,
    });
}
