/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import { PermissionID, RolePermission, isPermittedForResourceRealm } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import {
    PermissionEntity, RolePermissionEntity, RoleRepository, UserRepository,
} from '../../../../domains';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRolePermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROLE_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    await check('role_id')
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

    const data : Partial<RolePermission> = matchedData(req, {
        includeOptionals: false,
    });

    // ----------------------------------------------

    const roleRepository = getCustomRepository(RoleRepository);
    const role = await roleRepository.findOne(data.role_id);

    if (typeof role === 'undefined') {
        throw new BadRequestError('The referenced role was not found...');
    }

    if (!isPermittedForResourceRealm(req.realmId, role.realm_id)) {
        throw new BadRequestError('You are not permitted to add role-permissions for that realm');
    }

    // ----------------------------------------------

    const permissionRepository = getRepository(PermissionEntity);
    const permission = await permissionRepository.findOne(data.permission_id);

    if (typeof permission === 'undefined') {
        throw new BadRequestError('The referenced permission was not found...');
    }

    if (permission.target) {
        data.target = permission.target;
    }

    // ----------------------------------------------

    const ownedPermission = req.ability.findPermission(PermissionID.ROLE_PERMISSION_ADD);
    if (ownedPermission.target) {
        data.target = ownedPermission.target;
    }

    // ----------------------------------------------

    const repository = getRepository(RolePermissionEntity);
    let rolePermission = repository.create(data);

    rolePermission = await repository.save(rolePermission);

    return res.respondCreated({
        data: rolePermission,
    });
}
