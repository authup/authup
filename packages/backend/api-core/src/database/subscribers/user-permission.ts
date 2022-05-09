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
import { UserPermissionEntity } from '../../domains';
import { CachePrefix } from '../../redis';

@EventSubscriber()
export class UserPermissionSubscriber implements EntitySubscriberInterface<UserPermissionEntity> {
    listenTo(): CallableFunction | string {
        return UserPermissionEntity;
    }

    async afterInsert(event: InsertEvent<UserPermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<UserPermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }

    async afterRemove(event: RemoveEvent<UserPermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }
}
