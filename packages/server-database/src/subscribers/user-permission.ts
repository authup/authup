/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SocketEventOperations, UserPermission } from '@authup/common';
import type { SocketEmitterEventDestination } from '@authup/server-common';
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
import { UserPermissionEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'userPermission'>,
    data: UserPermission,
) {
    const destinations : SocketEmitterEventDestination[] = [
        {
            roomNameFn: (id) => buildSocketEntityRoomName('userPermission', id),
        },
    ];
    if (data.user_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('userPermission', id),
            namespace: buildSocketRealmNamespaceName(data.user_realm_id),
        });
    }

    if (data.permission_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('userPermission', id),
            namespace: buildSocketRealmNamespaceName(data.permission_realm_id),
        });
    }

    emitSocketEvent({
        destinations,
        operation,
        data,
    });
}

@EventSubscriber()
export class UserPermissionSubscriber implements EntitySubscriberInterface<UserPermissionEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
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

        publishEvent('userPermissionCreated', event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<UserPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        publishEvent('userPermissionUpdated', event.entity as UserPermission);
    }

    async afterRemove(event: RemoveEvent<UserPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        publishEvent('userPermissionDeleted', event.entity as UserPermission);
    }
}
