/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, isPermittedForResourceRealm } from '@typescript-auth/domains';
import { hash } from '@typescript-auth/server-utils';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserValidation } from './utils';
import { RealmEntity, UserRepository } from '../../../../domains';

export async function createUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.USER_ADD)) {
        throw new ForbiddenError('You are not permitted to add a user.');
    }

    const data = await runUserValidation(req, 'create');

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const user = await userRepository.create(data);

    const realmRepository = getRepository(RealmEntity);
    const realm = await realmRepository.findOne(data.realm_id);

    if (typeof realm === 'undefined') {
        throw new NotFoundError('The referenced realm could not be found.');
    }

    if (!isPermittedForResourceRealm(req.realmId, user.realm_id)) {
        throw new ForbiddenError(`You are not allowed to add users to the realm ${user.realm_id}`);
    }

    if (user.password) {
        user.password = await hash(user.password);
    }

    await userRepository.save(user);

    delete user.password;

    return res.respondCreated({ data: user });
}
