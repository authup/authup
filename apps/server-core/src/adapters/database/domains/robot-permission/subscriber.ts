/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RobotPermission,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestination} from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../event-publisher/index.ts';
import { RobotPermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: RobotPermission,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildEntityChannelName(EntityType.ROBOT_PERMISSION, id) },
    ];
    if (data.robot_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROBOT_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.robot_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROBOT_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.ROBOT_PERMISSION,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class RobotPermissionSubscriber implements EntitySubscriberInterface<RobotPermission> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listenTo(): Function | string {
        return RobotPermissionEntity;
    }

    async afterInsert(event: InsertEvent<RobotPermission>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    key: event.entity.robot_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<RobotPermission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    key: event.entity.robot_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as RobotPermission);
    }

    async afterRemove(event: RemoveEvent<RobotPermission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                    key: event.entity.robot_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
