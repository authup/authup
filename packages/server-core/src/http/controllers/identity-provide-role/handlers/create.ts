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
import {
    IdentityProviderRoleMappingEntity,
} from '../../../../domains';
import { IdentityPermissionService } from '../../../../services';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { IdentityProviderRoleMappingRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestEnv } from '../../../request';

export async function createOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_UPDATE });

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

    await permissionChecker.check({ name: PermissionName.IDENTITY_PROVIDER_UPDATE, data: { attributes: data } });

    const identity = permissionChecker.getRequestIdentity();
    if (!identity) {
        throw new ForbiddenError('You don\'t own the required permissions.');
    }

    const identityPermissionService = new IdentityPermissionService(dataSource);
    const hasPermissions = await identityPermissionService.hasSuperset(identity, {
        type: 'role',
        id: data.role_id,
    });
    if (!hasPermissions) {
        throw new ForbiddenError('You don\'t own the required permissions.');
    }

    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);
    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
