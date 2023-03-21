/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot, SocketEventOperations } from '@authup/common';
import { emitSocketEvent } from '@authup/server-common';
import { buildSocketEntityRoomName, buildSocketRealmNamespaceName } from '@authup/common';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { RobotEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'robot'>,
    data: Robot,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('robot', id),
                namespace: buildSocketRealmNamespaceName(data.realm_id),
            },
            {
                roomNameFn: (id) => buildSocketEntityRoomName('robot', id),
            },
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class RobotSubscriber implements EntitySubscriberInterface<RobotEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RobotEntity;
    }

    afterInsert(event: InsertEvent<RobotEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('robotCreated', event.entity as Robot);
    }

    async afterUpdate(event: UpdateEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        publishEvent('robotUpdated', event.entity as Robot);
    }

    async afterRemove(event: RemoveEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        publishEvent('robotDeleted', event.entity as Robot);
    }
}
