/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/common';
import { DomainEventName, DomainType, buildDomainChannelName } from '@authup/common';
import { publishDomainEvent } from '@authup/server-common';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { ClientScopeEntity } from '../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: ClientScope,
) {
    await publishDomainEvent(
        {
            type: DomainType.CLIENT_SCOPE,
            event,
            data,
        },
        [
            {
                channel: (id) => buildDomainChannelName(DomainType.CLIENT_SCOPE, id),
            },

            // todo: realm attribute
        ],
    );
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

        await publishEvent(DomainEventName.CREATED, event.entity as ClientScope);
    }

    async afterUpdate(event: UpdateEvent<ClientScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as ClientScope);
    }

    async afterRemove(event: RemoveEvent<ClientScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as ClientScope);
    }
}
