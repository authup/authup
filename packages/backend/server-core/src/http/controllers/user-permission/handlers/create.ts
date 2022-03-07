/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError } from '@typescript-error/http';
import { check, validationResult } from 'express-validator';
import { PermissionID, UserPermission, isPermittedForResourceRealm } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { PermissionEntity, UserPermissionEntity, UserRepository } from '../../../../domains';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createUserPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.USER_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    await check('user_id')
        .exists()
        .isUUID()
        .run(req);

    await check('permission_id')
        .exists()
        .notEmpty()
        .isString()
        .run(req);

    await check('target')
        .exists()
        .isString()
        .isLength({ min: 3, max: 16 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<UserPermission> = matchedValidationData(req, {
        includeOptionals: true,
    });

    // ----------------------------------------------

    const userRepository = getCustomRepository(UserRepository);
    const user = await userRepository.findOne(data.user_id);

    if (typeof user === 'undefined') {
        throw new BadRequestError('The referenced user was not found...');
    }

    if (!isPermittedForResourceRealm(req.realmId, user.realm_id)) {
        throw new BadRequestError('You are not permitted to add user-permissions for the given realm.');
    }

    // ----------------------------------------------

    const permissionRepository = getRepository(PermissionEntity);
    const permission = await permissionRepository.findOne(data.permission_id);

    if (typeof permission === 'undefined') {
        throw new BadRequestError('The referenced permission was not found.');
    }

    if (permission.target) {
        data.target = permission.target;
    }

    // ----------------------------------------------

    const ownedPermission = req.ability.findPermission(PermissionID.USER_PERMISSION_ADD);
    if (ownedPermission.target) {
        data.target = ownedPermission.target;
    }

    // ----------------------------------------------

    const repository = getRepository(UserPermissionEntity);
    let rolePermission = repository.create(data);

    rolePermission = await repository.save(rolePermission);

    return res.respondCreated({
        data: rolePermission,
    });
}
