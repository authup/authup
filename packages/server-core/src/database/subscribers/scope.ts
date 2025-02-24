/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Scope,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
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
import { CachePrefix, ScopeEntity } from '../domains';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: Scope,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.SCOPE,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildEntityChannelName(EntityType.USER, id),
                namespace: buildEntityNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildEntityChannelName(EntityType.USER, id),
            },
        ],
    });
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

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<ScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as ScopeEntity);
    }

    async afterRemove(event: RemoveEvent<ScopeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity as ScopeEntity);
    }
}
