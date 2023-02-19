/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { UserRoleEntity } from '../domains';
import { CachePrefix } from '../constants';

@EventSubscriber()
export class UserRoleSubscriber implements EntitySubscriberInterface<UserRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserRoleEntity;
    }

    async afterInsert(event: InsertEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    id: event.entity.user_id,
                }),
            ]);
        }
    }

    async afterUpdate(event: UpdateEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    id: event.entity.user_id,
                }),
            ]);
        }
    }

    async afterRemove(event: RemoveEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    id: event.entity.user_id,
                }),
            ]);
        }
    }
}
