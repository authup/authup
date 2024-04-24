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
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestination } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { publishDomainEvent } from '../../core';
import { UserPermissionEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: UserPermission,
) {
    const destinations : DomainEventDestination[] = [
        {
            channel: (id) => buildDomainChannelName(DomainType.USER_PERMISSION, id),
        },
    ];
    if (data.user_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.USER_PERMISSION, id),
            namespace: buildDomainNamespaceName(data.user_realm_id),
        });
    }

    if (data.permission_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.USER_PERMISSION, id),
            namespace: buildDomainNamespaceName(data.permission_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: DomainType.USER_PERMISSION,
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
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.CREATED, event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<UserPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as UserPermission);
    }

    async afterRemove(event: RemoveEvent<UserPermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                    id: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as UserPermission);
    }
}
