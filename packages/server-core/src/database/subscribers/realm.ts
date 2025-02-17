/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Realm,
} from '@authup/core-kit';
import {
    ResourceDefaultEventName,
    ResourceType,
    buildDomainChannelName,
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
import { CachePrefix, RealmEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: Realm,
) {
    await publishDomainEvent({
        content: {
            type: ResourceType.REALM,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildDomainChannelName(ResourceType.REALM, id),
            },
        ],
    });
}

@EventSubscriber()
export class RealmSubscriber implements EntitySubscriberInterface<RealmEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RealmEntity;
    }

    async afterInsert(event: InsertEvent<RealmEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity as Realm);
    }

    async afterUpdate(event: UpdateEvent<RealmEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.REALM,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as Realm);
    }

    async afterRemove(event: RemoveEvent<RealmEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.REALM,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity as Realm);
    }
}
