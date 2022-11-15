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
import { RoleAttributeEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';

export async function deleteRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const ability = useRequestEnv(req, 'ability');
    if (
        !ability.has(PermissionID.ROLE_EDIT) ||
        !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), entity.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to drop an attribute of this role...');
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
