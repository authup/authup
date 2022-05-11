/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EntitySubscriberInterface,
    EventSubscriber, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { RolePermissionEntity } from '../../domains';
import { CachePrefix } from '../../constants';

@EventSubscriber()
export class RolePermissionSubscriber implements EntitySubscriberInterface<RolePermissionEntity> {
    listenTo(): CallableFunction | string {
        return RolePermissionEntity;
    }

    async afterInsert(event: InsertEvent<RolePermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id: event.entity.role_id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<RolePermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id: event.entity.role_id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }

    async afterRemove(event: RemoveEvent<RolePermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id: event.entity.role_id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }
}
