/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Scope,
} from '@authup/common';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/common';
import { publishDomainEvent } from '@authup/server-common';
import type {
    EntitySubscriberInterface,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { ScopeEntity } from '../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: Scope,
) {
    await publishDomainEvent({
        type: DomainType.SCOPE,
        event,
        data,
    }, [
        {
            channel: (id) => buildDomainChannelName(DomainType.USER, id),
            namespace: buildDomainNamespaceName(data.realm_id),
        },
        {
            channel: (id) => buildDomainChannelName(DomainType.USER, id),
        },
    ]);
}

@EventSubscriber()
export class ScopeSubscriber implements EntitySubscriberInterface<ScopeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ScopeEntity;
    }

    async afterInsert(event: InsertEvent<ScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(DomainEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<ScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as ScopeEntity);
    }

    async afterRemove(event: RemoveEvent<ScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.USER,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as ScopeEntity);
    }
}
