/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SocketEventOperations, UserAttribute } from '@authup/common';
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
import { UserAttributeEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'userAttribute'>,
    data: UserAttribute,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('userAttribute', id),
                namespace: buildSocketRealmNamespaceName(data.realm_id),
            },
            {
                roomNameFn: (id) => buildSocketEntityRoomName('userAttribute', id),
            },
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class UserAttributeSubscriber implements EntitySubscriberInterface<UserAttributeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserAttributeEntity;
    }

    async afterInsert(event: InsertEvent<UserAttributeEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                    id: event.entity.user_id,
                }),
            ]);
        }

        publishEvent('userAttributeCreated', event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<UserAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                    id: event.entity.user_id,
                }),
            ]);
        }

        publishEvent('userAttributeUpdated', event.entity as UserAttributeEntity);
    }

    async afterRemove(event: RemoveEvent<UserAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                    id: event.entity.user_id,
                }),
            ]);
        }

        publishEvent('userAttributeDeleted', event.entity);
    }
}
