/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import {
    PermissionID,
    isPermittedForResourceRealm,
} from '@authelion/common';
import { buildKeyPath } from 'redis-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserAttributeValidation } from '../utils';
import { UserAttributeEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';
import { CachePrefix } from '../../../../redis/constants';

export async function createUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const result = await runUserAttributeValidation(req, CRUDOperation.CREATE);
    if (!result) {
        return res.respondAccepted();
    }

    if (
        result.data.user_id !== req.userId
    ) {
        if (
            !req.ability.hasPermission(PermissionID.USER_EDIT) ||
            !isPermittedForResourceRealm(req.realmId, result.data.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to set an attribute for the given user...');
        }
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    if (dataSource.queryResultCache) {
        await dataSource.queryResultCache.remove([
            buildKeyPath({
                prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                id: entity.user_id,
            }),
        ]);
    }

    return res.respondCreated({
        data: entity,
    });
}
