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

export async function createUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.USER_ADD)) {
        throw new ForbiddenError('You are not permitted to add a user.');
    }

    const data = await runUserValidation(req, 'create');

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const user = await userRepository.create(data);

    const realmRepository = getRepository(Realm);
    const realm = await realmRepository.findOne(data.realm_id);

    if (typeof realm === 'undefined') {
        throw new NotFoundError('The referenced realm could not be found.');
    }

    if (!isPermittedForResourceRealm(req.realmId, user.realm_id)) {
        throw new ForbiddenError(`You are not allowed to add users to the realm ${user.realm_id}`);
    }

    if (user.password) {
        user.password = await hashPassword(user.password);
    }

    await userRepository.save(user);

    delete user.password;

    return res.respondCreated({ data: user });
}
