/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RoleRepository, UserRoleEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { UserRoleRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createUserRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    if (!await abilities.has(PermissionName.USER_ROLE_CREATE)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();

    const validator = new UserRoleRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    // ----------------------------------------------

    const policyEvaluationContext : PolicyEvaluationContext = {
        attributes: data satisfies Partial<UserRoleEntity>,
    };

    // ----------------------------------------------

    if (data.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.role.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('role_id'));
        }

        data.role_realm_id = data.role.realm_id;

        const roleRepository = new RoleRepository(dataSource);
        const roleAbilities = await roleRepository.getOwnedPermissions(data.role_id);
        if (!await abilities.can(roleAbilities, policyEvaluationContext)) {
            throw new ForbiddenError('The role permissions are not owned.');
        }
    }

    // ----------------------------------------------

    if (data.user) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.user.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }

        data.user_realm_id = data.user.realm_id;
    }

    // ----------------------------------------------

    if (!await abilities.can(PermissionName.USER_ROLE_CREATE, policyEvaluationContext)) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const repository = dataSource.getRepository(UserRoleEntity);
    let entity = repository.create(data);

    entity = await repository.save(entity);

    return sendCreated(res, entity);
}
