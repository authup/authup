/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SocketEventOperations, User } from '@authup/common';
import { emitSocketEvent } from '@authup/server-common';
import { buildSocketEntityRoomName, buildSocketRealmNamespaceName } from '@authup/common';
import type {
    EntitySubscriberInterface,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { RobotEntity, UserEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'user'>,
    data: User,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('user', id),
                namespace: buildSocketRealmNamespaceName(data.realm_id),
            },
            {
                roomNameFn: (id) => buildSocketEntityRoomName('user', id),
            },
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<UserEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserEntity;
    }

    afterInsert(event: InsertEvent<UserEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('userCreated', event.entity);
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

        publishEvent('userUpdated', event.entity as UserEntity);
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

        publishEvent('userDeleted', event.entity as UserEntity);
    }
}
