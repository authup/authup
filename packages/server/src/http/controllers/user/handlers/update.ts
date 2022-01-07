/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';
import { PermissionID, Realm, isPermittedForResourceRealm } from '@typescript-auth/domains';
import { matchedData, validationResult } from 'express-validator';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserValidation } from './utils';
import { ExpressValidationError } from '../../../error/validation';
import { UserRepository } from '../../../../domains';
import { hashPassword } from '../../../../utils';

export async function updateUserRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id: idStr } = req.params;

    const id : number = parseInt(idStr, 10);

    if (Number.isNaN(id)) {
        throw new BadRequestError('The user identifier is not valid.');
    }

    if (
        !req.ability.hasPermission(PermissionID.USER_EDIT) &&
        req.user.id !== id
    ) {
        throw new ForbiddenError('You are not authorized to modify a user.');
    }

    await runUserValidation(req, 'update');

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });
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

    user = userRepository.merge(user, data);

    await userRepository.save(user);

    if (typeof user.realm_id !== 'undefined') {
        user.realm = await getRepository(Realm).findOne(user.realm_id);
    }

    return res.respond({
        data: user,
    });
}
