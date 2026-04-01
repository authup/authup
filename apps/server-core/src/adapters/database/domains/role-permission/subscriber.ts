/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RolePermission } from '@authup/core-kit';
import {
    EntityDefaultEventName, 
    EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestination } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, 
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import { EventSubscriber } from 'typeorm';
import { publishDomainEvent } from '../../event-publisher/index.ts';
import { RolePermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: RolePermission,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildEntityChannelName(EntityType.ROLE_PERMISSION, id) },
    ];
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROLE_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.role_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROLE_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.ROLE_PERMISSION,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class RolePermissionSubscriber implements EntitySubscriberInterface<RolePermission> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listenTo(): Function | string {
        return RolePermissionEntity;
    }

    async afterInsert(event: InsertEvent<RolePermission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    key: event.entity.role_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RolePermission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    key: event.entity.role_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as RolePermission);
    }

    async afterRemove(event: RemoveEvent<RolePermission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    key: event.entity.role_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
