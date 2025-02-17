/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAttribute } from '@authup/core-kit';
import {
    ResourceDefaultEventName, ResourceType, buildResourceChannelName, buildResourceNamespaceName,
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
import { CachePrefix, PolicyAttributeEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: PolicyAttribute,
) {
    await publishDomainEvent({
        content: {
            type: ResourceType.POLICY_ATTRIBUTE,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildResourceChannelName(ResourceType.POLICY_ATTRIBUTE, id),
                namespace: buildResourceNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildResourceChannelName(ResourceType.POLICY_ATTRIBUTE, id),
            },
        ],
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

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity);
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

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as PolicyAttribute);
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

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity);
    }
}
