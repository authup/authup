/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientPermission,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
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
import { publishDomainEvent } from '../../../core';
import { CachePrefix, ClientPermissionEntity } from '../domains';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: ClientPermission,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildEntityChannelName(EntityType.CLIENT_PERMISSION, id) },
    ];
    if (data.client_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.CLIENT_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.client_realm_id),
        });
    }
    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.CLIENT_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.CLIENT_PERMISSION,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class ClientPermissionSubscriber implements EntitySubscriberInterface<ClientPermissionEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ClientPermissionEntity;
    }

    async afterInsert(event: InsertEvent<ClientPermissionEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
                    key: event.entity.client_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<ClientPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
                    key: event.entity.client_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as ClientPermission);
    }

    async afterRemove(event: RemoveEvent<ClientPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
                    key: event.entity.client_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
