/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, Realm, isPermittedForResourceRealm } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserValidation } from './utils';
import { UserRepository } from '../../../../domains';
import { hashPassword } from '../../../../utils';

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

    const userRepository = getCustomRepository<UserRepository>(UserRepository);

    if (typeof data.password !== 'undefined') {
        data.password = await hashPassword(data.password);
    }

    let user = await userRepository.findOne(id);
    if (typeof user === 'undefined') {
        throw new NotFoundError();
    }

    if (!isPermittedForResourceRealm(req.realmId, user.realm_id)) {
        throw new ForbiddenError(`You are not allowed to edit users of the realm ${user.realm_id}`);
    }

    if (typeof data.realm_id === 'string') {
        if (!isPermittedForResourceRealm(req.realmId, data.realm_id)) {
            throw new ForbiddenError(`You are not allowed to move users to the realm ${data.realm_id}`);
        }
    }

    if (
        typeof data.name === 'string' &&
        data.name !== user.name
    ) {
        if (typeof data.name_locked !== 'undefined') {
            user.name_locked = data.name_locked;
        }

        if (user.name_locked) {
            delete data.name;
        }
    }

    user = userRepository.merge(user, data);

    await userRepository.save(user);

    return res.respond({
        data: user,
    });
}
