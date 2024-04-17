/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RobotPermission,
} from '@authup/core-kit';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestination } from '@authup/server-kit';
import { publishDomainEvent } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { RobotPermissionEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: RobotPermission,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildDomainChannelName(DomainType.ROBOT_PERMISSION, id) },
    ];
    if (data.robot_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.ROBOT_PERMISSION, id),
            namespace: buildDomainNamespaceName(data.robot_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.ROBOT_PERMISSION, id),
            namespace: buildDomainNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        type: DomainType.ROBOT_PERMISSION,
        event,
        data,
    }, destinations);
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

        await publishEvent(DomainEventName.CREATED, event.entity);

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

        await publishEvent(DomainEventName.UPDATED, event.entity as RobotPermission);
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

        await publishEvent(DomainEventName.DELETED, event.entity);
    }
}
