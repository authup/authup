/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProviderAttribute,
} from '@authup/core-kit';
import {
    DomainEventName, ResourceType,
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
import { CachePrefix, IdentityProviderAttributeEntity } from '../domains';

async function publishEvent(
    event: `${DomainEventName}`,
    data: IdentityProviderAttribute,
) {
    await publishDomainEvent({
        content: {
            type: ResourceType.IDENTITY_PROVIDER_ATTRIBUTE,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildDomainChannelName(ResourceType.IDENTITY_PROVIDER_ATTRIBUTE, id),
            },

            // todo: realm attribute
        ],
    });
}

@EventSubscriber()
export class IdentityProviderAttributeSubscriber implements EntitySubscriberInterface<IdentityProviderAttributeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderAttributeEntity;
    }

    async afterInsert(event: InsertEvent<IdentityProviderAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(DomainEventName.CREATED, event.entity as IdentityProviderAttribute);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER_ATTRIBUTE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as IdentityProviderAttribute);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER_ATTRIBUTE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as IdentityProviderAttribute);
    }
}
