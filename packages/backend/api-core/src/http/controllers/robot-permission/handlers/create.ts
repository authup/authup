/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import { PermissionID, RobotPermission, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import {
    PermissionEntity, RobotPermissionEntity, RobotRepository, RoleRepository, UserRepository,
} from '../../../../domains';

/**
 * Add an permission by id to a specific user.
 *
 * @param req
 * @param res
 */
export async function createRobotPermissionRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    if (!req.ability.hasPermission(PermissionID.ROBOT_PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    await check('robot_id')
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

    const data : Partial<RobotPermission> = matchedData(req, { includeOptionals: false });

    // ----------------------------------------------

    const robotRepository = getCustomRepository(RobotRepository);
    const robot = await robotRepository.findOne(data.robot_id);

    if (typeof robot === 'undefined') {
        throw new BadRequestError('The referenced user was not found...');
    }

    if (!isPermittedForResourceRealm(req.realmId, robot.realm_id)) {
        throw new BadRequestError('You are not permitted to add robot-permissions for the given realm.');
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

    const ownedPermission = req.ability.findPermission(PermissionID.ROBOT_PERMISSION_ADD);
    if (ownedPermission.target) {
        data.target = ownedPermission.target;
    }

    // ----------------------------------------------

    const repository = getRepository(RobotPermissionEntity);
    let rolePermission = repository.create(data);

    rolePermission = await repository.save(rolePermission);

    return res.respondCreated({
        data: rolePermission,
    });
}
