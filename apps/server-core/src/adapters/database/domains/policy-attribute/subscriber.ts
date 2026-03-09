/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAttribute } from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType, buildEntityChannelName, buildEntityNamespaceName,
} from '@authup/core-kit';
import { DomainEventDestinations, buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../event-publisher/index.ts';
import { PolicyAttributeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: PolicyAttribute,
) {
    const destinations : DomainEventDestinations = [
        {
            channel: (id) => buildEntityChannelName(EntityType.POLICY_ATTRIBUTE, id),
        },
    ];
    if (data.realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.POLICY_ATTRIBUTE, id),
            namespace: buildEntityNamespaceName(data.realm_id),
        });
    }
    await publishDomainEvent({
        content: {
            type: EntityType.POLICY_ATTRIBUTE,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class PolicyAttributeSubscriber implements EntitySubscriberInterface<PolicyAttributeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return PolicyAttributeEntity;
    }

    async afterInsert(event: InsertEvent<PolicyAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
                    key: event.entity.policy_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<PolicyAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
                    key: event.entity.policy_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as PolicyAttribute);
    }

    async afterRemove(event: RemoveEvent<PolicyAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
                    key: event.entity.policy_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
