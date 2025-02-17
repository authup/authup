/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserPermission,
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
import { CachePrefix, UserPermissionEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: UserPermission,
) {
    const destinations : DomainEventDestination[] = [
        {
            channel: (id) => buildResourceChannelName(ResourceType.USER_PERMISSION, id),
        },
    ];
    if (data.user_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.USER_PERMISSION, id),
            namespace: buildResourceNamespaceName(data.user_realm_id),
        });
    }

    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.USER_PERMISSION, id),
            namespace: buildResourceNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: ResourceType.USER_PERMISSION,
            event,
            data,
        },
        destinations,
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
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<UserPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as UserPermission);
    }

    async afterRemove(event: RemoveEvent<UserPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity as UserPermission);
    }
}
