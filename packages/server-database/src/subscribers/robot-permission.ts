/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotPermission, SocketEventOperations } from '@authup/common';
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
import { RobotPermissionEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'robotPermission'>,
    data: RobotPermission,
) {
    const destinations : SocketEmitterEventDestination[] = [
        { roomNameFn: (id) => buildSocketEntityRoomName('robotPermission', id) },
    ];
    if (data.robot_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('robotPermission', id),
            namespace: buildSocketRealmNamespaceName(data.robot_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('robotPermission', id),
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
export class RobotPermissionSubscriber implements EntitySubscriberInterface<RobotPermissionEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RobotPermissionEntity;
    }

    async afterInsert(event: InsertEvent<RobotPermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    id: event.entity.robot_id,
                }),
            ]);
        }

        publishEvent('robotPermissionCreated', event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<RobotPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    id: event.entity.robot_id,
                }),
            ]);
        }

        publishEvent('robotPermissionUpdated', event.entity as RobotPermission);
    }

    async afterRemove(event: RemoveEvent<RobotPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    id: event.entity.robot_id,
                }),
            ]);
        }

        publishEvent('robotPermissionDeleted', event.entity);
    }
}
