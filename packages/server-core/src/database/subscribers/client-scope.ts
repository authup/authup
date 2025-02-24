/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import { EntityDefaultEventName, EntityType, buildEntityChannelName } from '@authup/core-kit';
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
import { CachePrefix, ClientScopeEntity } from '../domains';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: ClientScope,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.CLIENT_SCOPE,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildEntityChannelName(EntityType.CLIENT_SCOPE, id),
            },

            // todo: realm attribute
        ],
    });
}

@EventSubscriber()
export class ClientScopeSubscriber implements EntitySubscriberInterface<ClientScopeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ClientScopeEntity;
    }

    async afterInsert(event: InsertEvent<ClientScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity as ClientScope);
    }

    async afterUpdate(event: UpdateEvent<ClientScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_SCOPE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as ClientScope);
    }

    async afterRemove(event: RemoveEvent<ClientScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_SCOPE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity as ClientScope);
    }
}
