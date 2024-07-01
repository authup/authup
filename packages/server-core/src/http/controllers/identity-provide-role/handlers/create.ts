/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { IdentityProviderRoleMappingEntity, RoleRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { IdentityProviderRoleMappingRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE)) {
        throw new ForbiddenError();
    }

    const validator = new IdentityProviderRoleMappingRequestValidator();

    const data = await validator.execute(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (data.provider) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.provider.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('provider_id'));
        }

        data.provider_realm_id = data.provider.realm_id;
    }

    if (data.role) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.role.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('role_id'));
        }

        data.role_realm_id = data.role.realm_id;
    }

    if (
        data.role_realm_id &&
        data.provider_realm_id &&
        data.role_realm_id !== data.provider_realm_id
    ) {
        throw new BadRequestError('It is not possible to map an identity provider to a role of another realm.');
    }

    if (!await ability.can(PermissionName.IDENTITY_PROVIDER_UPDATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();

    const roleRepository = new RoleRepository(dataSource);
    const roleAbilities = await roleRepository.getOwnedPermissions(data.role_id);
    if (!await ability.hasMany(roleAbilities)) {
        throw new ForbiddenError('You don\'t own all role permissions.');
    }

    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);

    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
