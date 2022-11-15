/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import {
    Request, Response, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { IdentityProviderRoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

export async function deleteOauth2ProvideRoleRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleEntity);
    const entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (
        !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), entity.provider_realm_id) ||
        !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), entity.role_realm_id)
    ) {
        throw new ForbiddenError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res);
}
