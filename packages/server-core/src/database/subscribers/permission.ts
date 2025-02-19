/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPermissionItemKey } from '@authup/access';
import type {
    Permission,
} from '@authup/core-kit';
import {
    ResourceDefaultEventName,
    ResourceType,
    buildResourceChannelName,
} from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../core';
import { CachePrefix, PermissionEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: Permission,
) {
    await publishDomainEvent({
        content: {
            type: ResourceType.PERMISSION,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildResourceChannelName(ResourceType.PERMISSION, id),
            },
        ],
    });
}

@EventSubscriber()
export class PermissionSubscriber implements EntitySubscriberInterface<PermissionEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return PermissionEntity;
    }

    async afterInsert(event: InsertEvent<PermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity as Permission);
    }

    async afterUpdate(event: UpdateEvent<PermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.PERMISSION,
                    key: event.entity.id,
                }),
                buildRedisKeyPath({
                    prefix: CachePrefix.PERMISSION,
                    key: buildPermissionItemKey({
                        name: event.entity.name,
                        clientId: event.entity.client_id,
                        realmId: event.entity.realm_id,
                    }),
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as Permission);
    }

    async afterRemove(event: RemoveEvent<PermissionEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.PERMISSION,
                    key: event.entity.id,
                }),
                buildPermissionItemKey({
                    name: event.entity.name,
                    clientId: event.entity.client_id,
                    realmId: event.entity.realm_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity as Permission);
    }
}
