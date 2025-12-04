/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserRole,
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
import { CachePrefix, UserRoleEntity } from '../domains';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: UserRole,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildEntityChannelName(EntityType.USER_ROLE, id) },
    ];
    if (data.user_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.USER_ROLE, id),
            namespace: buildEntityNamespaceName(data.user_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.USER_ROLE, id),
            namespace: buildEntityNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.USER_ROLE,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class UserRoleSubscriber implements EntitySubscriberInterface<UserRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserRoleEntity;
    }

    async afterInsert(event: InsertEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_ROLES,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_ROLES,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as UserRoleEntity);
    }

    async afterRemove(event: RemoveEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_ROLES,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
