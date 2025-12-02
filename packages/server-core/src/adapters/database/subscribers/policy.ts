/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Policy,
} from '@authup/core-kit';
import {
    EntityDefaultEventName,
    EntityType,
    buildEntityChannelName,
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
import { publishDomainEvent } from '../../../core';
import { CachePrefix, PolicyEntity } from '../domains';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: Policy,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.POLICY,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildEntityChannelName(EntityType.POLICY, id),
            },
        ],
    });
}

@EventSubscriber()
export class PolicySubscriber implements EntitySubscriberInterface<PolicyEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return PolicyEntity;
    }

    async afterInsert(event: InsertEvent<PolicyEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity as Policy);
    }

    async afterUpdate(event: UpdateEvent<PolicyEntity>): Promise<any> {
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

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as Policy);
    }

    async afterRemove(event: RemoveEvent<PolicyEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.POLICY,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity as Policy);
    }
}
