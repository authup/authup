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
import { RobotEntity } from '../../domains';
import { CachePrefix } from '../../redis';

@EventSubscriber()
export class RobotSubscriber implements EntitySubscriberInterface<RobotEntity> {
    listenTo(): CallableFunction | string {
        return RobotEntity;
    }

    async afterUpdate(event: UpdateEvent<RobotEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }

    async afterRemove(event: RemoveEvent<RobotEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        return Promise.resolve(undefined);
    }
}
