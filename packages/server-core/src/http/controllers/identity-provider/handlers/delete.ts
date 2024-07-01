/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { IdentityProviderEntity } from '../../../../domains';
import { useRequestIDParam } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function deleteIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestIDParam(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.IDENTITY_PROVIDER_DELETE)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (!await ability.can(PermissionName.IDENTITY_PROVIDER_DELETE, { attributes: entity })) {
        throw new ForbiddenError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
