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
import { UserAttributeEntity } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';

export async function deleteUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (entity.user_id !== useRequestEnv(req, 'userId')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
            throw new ForbiddenError('You are not permitted for the resource realm.');
        }

        if (!await useRequestEnv(req, 'abilities').can(PermissionName.USER_UPDATE, { attributes: entity })) {
            throw new ForbiddenError();
        }
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
