/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Role,
} from '@authup/core-kit';
import {
    ResourceDefaultEventName, ResourceType,
    buildResourceChannelName,
    buildResourceNamespaceName,
} from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../core';
import { CachePrefix, RoleEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: Role,
) {
    await publishDomainEvent({
        content: {
            type: ResourceType.ROLE,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildResourceChannelName(ResourceType.ROLE, id),
                namespace: buildResourceNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildResourceChannelName(ResourceType.ROLE, id),
            },
        ],
    });
}

@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<RoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RoleEntity;
    }

    async afterInsert(event: InsertEvent<RoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as RoleEntity);
    }

    async afterRemove(event: RemoveEvent<RoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity as RoleEntity);
    }
}
