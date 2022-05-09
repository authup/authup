/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@typescript-error/http';

import { PermissionID, isPermittedForResourceRealm } from '@authelion/common';
import { buildKeyPath } from 'redis-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { UserAttributeEntity } from '../../../../domains';
import { useDataSource } from '../../../../database';
import { CachePrefix } from '../../../../redis/constants';

export async function deleteUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    if (
        entity.user_id !== req.userId
    ) {
        if (
            !req.ability.hasPermission(PermissionID.USER_EDIT) ||
            !isPermittedForResourceRealm(req.realmId, entity.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to drop an attribute for the given user...');
        }
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    if (dataSource.queryResultCache) {
        await dataSource.queryResultCache.remove([
            buildKeyPath({
                prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                id: entity.user_id,
            }),
        ]);
    }

    return res.respondDeleted({
        data: entity,
    });
}
