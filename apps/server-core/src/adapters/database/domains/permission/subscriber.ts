/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EntityDefaultEventName,
    EntityType,
    buildEntityChannelName,
    buildPermissionBindingKey, 
} from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, 
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import { EventSubscriber } from 'typeorm';
import { publishDomainEvent } from '../../event-publisher/index.ts';
import { PermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: Permission,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.PERMISSION,
            event,
            data,
        },
        destinations: [
            { channel: (id) => buildEntityChannelName(EntityType.PERMISSION, id) },
        ],
    });
}

@EventSubscriber()
export class PermissionSubscriber implements EntitySubscriberInterface<Permission> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listenTo(): Function | string {
        return PermissionEntity;
    }

    async afterInsert(event: InsertEvent<Permission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<Permission>): Promise<any> {
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
                    key: buildPermissionBindingKey({
                        name: event.entity.name,
                        client_id: event.entity.client_id,
                        realm_id: event.entity.realm_id,
                    }),
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as Permission);
    }

    async afterRemove(event: RemoveEvent<Permission>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.PERMISSION,
                    key: event.entity.id,
                }),
                buildPermissionBindingKey({
                    name: event.entity.name,
                    client_id: event.entity.client_id,
                    realm_id: event.entity.realm_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
