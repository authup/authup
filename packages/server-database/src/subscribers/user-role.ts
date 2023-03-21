/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SocketEventOperations, UserRole } from '@authup/common';
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
import { UserRoleEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'userRole'>,
    data: UserRole,
) {
    const destinations : SocketEmitterEventDestination[] = [
        { roomNameFn: (id) => buildSocketEntityRoomName('userRole', id) },
    ];
    if (data.user_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('userRole', id),
            namespace: buildSocketRealmNamespaceName(data.user_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('userRole', id),
            namespace: buildSocketRealmNamespaceName(data.role_realm_id),
        });
    }

    emitSocketEvent({
        destinations,
        operation,
        data,
    });
}

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

        publishEvent('userRoleCreated', event.entity);
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

        publishEvent('userRoleUpdated', event.entity as UserRoleEntity);
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

        publishEvent('userRoleDeleted', event.entity);
    }
}
