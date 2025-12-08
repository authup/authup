/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserPermission,
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
import { publishDomainEvent } from '../../../domain-event-publisher';
import { UserPermissionEntity } from './entity';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: UserPermission,
) {
    const destinations : DomainEventDestination[] = [
        {
            channel: (id) => buildEntityChannelName(EntityType.USER_PERMISSION, id),
        },
    ];
    if (data.user_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.USER_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.user_realm_id),
        });
    }

    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.USER_PERMISSION, id),
            namespace: buildEntityNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.USER_PERMISSION,
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

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);

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

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as UserPermission);
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

        await publishEvent(EntityDefaultEventName.DELETED, event.entity as UserPermission);
    }
}
