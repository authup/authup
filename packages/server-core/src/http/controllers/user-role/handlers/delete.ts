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
import { UserRoleEntity } from '../../../../domains';
import { useRequestParamID } from '../../../request';
import { useRequestEnv } from '../../../utils';

export async function deleteUserRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.USER_ROLE_DELETE)) {
        throw new ForbiddenError();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserRoleEntity);

    const entity = await repository.findOne({
        where: {
            id,
        },
        relations: {
            user: true,
            role: true,
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    // ----------------------------------------------

    if (
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.user_realm_id) ||
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.role_realm_id)
    ) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    if (!await ability.can(PermissionName.USER_ROLE_DELETE, { attributes: entity })) {
        throw new ForbiddenError();
    }

    // ----------------------------------------------

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
