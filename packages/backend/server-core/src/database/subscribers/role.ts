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
import { RoleEntity } from '../../domains';
import { CachePrefix } from '../../constants';

@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<RoleEntity> {
    listenTo(): CallableFunction | string {
        return RoleEntity;
    }

    async afterUpdate(event: UpdateEvent<RoleEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE,
                    id: event.entity.id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }

    async afterRemove(event: RemoveEvent<RoleEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE,
                    id: event.entity.id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }
}
