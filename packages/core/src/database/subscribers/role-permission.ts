/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RolePermission,
} from '@authup/core';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/core';
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
import { RolePermissionEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: RolePermission,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildDomainChannelName(DomainType.ROLE_PERMISSION, id) },
    ];
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.ROLE_PERMISSION, id),
            namespace: buildDomainNamespaceName(data.role_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.ROLE_PERMISSION, id),
            namespace: buildDomainNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        type: DomainType.ROLE_PERMISSION,
        event,
        data,
    }, destinations);
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
                buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id: event.entity.role_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RolePermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id: event.entity.role_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as RolePermission);
    }

    async afterRemove(event: RemoveEvent<RolePermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                    id: event.entity.role_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity);
    }
}
