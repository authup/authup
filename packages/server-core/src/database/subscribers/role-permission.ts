/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RolePermission,
} from '@authup/core-kit';
import {
    ResourceDefaultEventName, ResourceType,
    buildResourceChannelName,
    buildResourceNamespaceName,
} from '@authup/core-kit';
import { DomainEventDestination, buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../core';
import { CachePrefix, RolePermissionEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: RolePermission,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildResourceChannelName(ResourceType.ROLE_PERMISSION, id) },
    ];
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.ROLE_PERMISSION, id),
            namespace: buildResourceNamespaceName(data.role_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.ROLE_PERMISSION, id),
            namespace: buildResourceNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: ResourceType.ROLE_PERMISSION,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class RolePermissionSubscriber implements EntitySubscriberInterface<RolePermissionEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RolePermissionEntity;
    }

    async afterInsert(event: InsertEvent<RolePermissionEntity>): Promise<any> {
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

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RolePermissionEntity>): Promise<any> {
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

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as RolePermission);
    }

    async afterRemove(event: RemoveEvent<RolePermissionEntity>): Promise<any> {
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

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity);
    }
}
