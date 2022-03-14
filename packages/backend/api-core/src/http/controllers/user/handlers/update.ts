/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, Realm, isPermittedForResourceRealm } from '@authelion/common';
import { hash } from '@authelion/api-utils';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserValidation } from './utils';
import { UserRepository } from '../../../../domains';

export async function updateUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (
        !req.ability.hasPermission(PermissionID.USER_EDIT) &&
        req.user.id !== id
    ) {
        throw new ForbiddenError('You are not authorized to modify a user.');
    }

    const data = await runUserValidation(req, 'update');
    if (!data) {
        return res.respondAccepted();
    }

    const repository = getCustomRepository<UserRepository>(UserRepository);

    if (typeof data.password !== 'undefined') {
        data.password = await hash(data.password);
    }

    let entity = await repository.findOne(id);
    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, entity.realm_id)) {
        throw new ForbiddenError(`You are not allowed to edit users of the realm ${entity.realm_id}`);
    }

    if (typeof data.realm_id === 'string') {
        if (!isPermittedForResourceRealm(req.realmId, data.realm_id)) {
            throw new ForbiddenError(`You are not allowed to move users to the realm ${data.realm_id}`);
        }
    }

    if (
        typeof data.name === 'string' &&
        data.name !== entity.name
    ) {
        if (typeof data.name_locked !== 'undefined') {
            entity.name_locked = data.name_locked;
        }

        if (entity.name_locked) {
            delete data.name;
        }
    }

    entity = repository.merge(entity, data);

    await repository.save(entity);

    return res.respond({
        data: entity,
    });
}
