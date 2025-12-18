/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType, buildEntityChannelName, buildEntityNamespaceName,
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
import { publishDomainEvent } from '../../event-publisher';
import { ClientEntity } from './entity';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: Client,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.CLIENT,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildEntityChannelName(EntityType.CLIENT, id),
                namespace: buildEntityNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildEntityChannelName(EntityType.CLIENT, id),
            },
        ],
    });
}

@EventSubscriber()
export class ClientSubscriber implements EntitySubscriberInterface<ClientEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ClientEntity;
    }

    async afterInsert(event: InsertEvent<ClientEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity as Client);
    }

    async afterUpdate(event: UpdateEvent<ClientEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as Client);
    }

    async afterRemove(event: RemoveEvent<ClientEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity as Client);
    }
}
