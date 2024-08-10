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
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { IdentityProviderRoleMappingEntity, RoleRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { IdentityProviderRoleMappingRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestEnv } from '../../../request';

export async function createOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE)) {
        throw new ForbiddenError();
    }

    const validator = new IdentityProviderRoleMappingRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);

    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: IdentityProviderRoleMappingEntity,
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

    const roleRepository = new RoleRepository(dataSource);
    const permissions = await roleRepository.getOwnedPermissions(data.role_id);
    if (!await ability.hasMany(permissions)) {
        throw new ForbiddenError('You don\'t own all role permissions.');
    }

    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);

    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
