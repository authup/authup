/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EntitySubscriberInterface,
    EventSubscriber,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { UserEntity } from '../domains';
import { CachePrefix } from '../constants';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<UserEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserEntity;
    }

    async afterUpdate(event: UpdateEvent<UserEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER,
                    id: event.entity.id,
                }),
            ]);
        }
    }

    async afterRemove(event: RemoveEvent<UserEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER,
                    id: event.entity.id,
                }),
            ]);
        }
    }
}
