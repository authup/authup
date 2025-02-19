/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import {
    IdentityProviderRoleMappingEntity,
} from '../../../../../database/domains';
import { IdentityPermissionService } from '../../../../../services';
import { IdentityProviderRoleMappingRequestValidator } from '../utils';
import {
    RequestHandlerOperation, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../../request';

export async function createOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({
        name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE,
    });

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
        data.provider_realm_id = data.provider.realm_id;
    }

    if (data.role) {
        data.role_realm_id = data.role.realm_id;
    }

    if (
        data.role_realm_id &&
        data.provider_realm_id &&
        data.role_realm_id !== data.provider_realm_id
    ) {
        throw new BadRequestError('It is not possible to map an identity provider to a role of another realm.');
    }

    await permissionChecker.check({
        name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE,
        data: {
            attributes: data,
        },
    });

    const identity = useRequestIdentityOrFail(req);
    const identityPermissionService = new IdentityPermissionService(dataSource);
    const hasPermissions = await identityPermissionService.hasSuperset(identity, {
        type: 'role',
        id: data.role_id,
        clientId: data.role.client_id,
    });
    if (!hasPermissions) {
        throw new ForbiddenError('You don\'t own the required permissions.');
    }

    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);
    const entity = repository.create(data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
