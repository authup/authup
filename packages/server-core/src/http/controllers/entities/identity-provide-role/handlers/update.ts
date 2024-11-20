/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { IdentityProviderRoleMappingEntity } from '../../../../../database/domains';
import { IdentityProviderRoleMappingRequestValidator } from '../utils';
import {
    RequestHandlerOperation, useRequestParamID, useRequestPermissionChecker,
} from '../../../../request';

export async function updateOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({
        name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE,
    });

    const validator = new IdentityProviderRoleMappingRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: IdentityProviderRoleMappingEntity,
    });

    const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, data);

    await permissionChecker.check({
        name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE,
        data: {
            attributes: entity,
        },
    });

    await repository.save(entity);

    return sendAccepted(res, entity);
}
