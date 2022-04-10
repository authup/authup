/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository, getRepository } from 'typeorm';
import { BadRequestError, ForbiddenError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import { PermissionID, RolePermission, isPermittedForResourceRealm } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../express-validation';
import {
    PermissionEntity, RolePermissionEntity, RoleRepository, UserRepository,
} from '../../../../domains';
import { runRolePermissionValidation } from '../utils/validation';
import { CRUDOperation } from '../../../constants';

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

    // ----------------------------------------------

    const result = await runRolePermissionValidation(req, CRUDOperation.CREATE);

    // ----------------------------------------------

    const repository = getRepository(RolePermissionEntity);
    let rolePermission = repository.create(result.data);

    rolePermission = await repository.save(rolePermission);

    return res.respondCreated({
        data: rolePermission,
    });
}
