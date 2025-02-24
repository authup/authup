/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';
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
import { publishDomainEvent } from '../../core';
import { CachePrefix, IdentityProviderEntity } from '../domains';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: IdentityProvider,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.IDENTITY_PROVIDER,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildEntityChannelName(EntityType.IDENTITY_PROVIDER, id),
                namespace: buildEntityNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildEntityChannelName(EntityType.IDENTITY_PROVIDER, id),
            },
        ],
    });
}

@EventSubscriber()
export class IdentityProviderSubscriber implements EntitySubscriberInterface<IdentityProviderEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderEntity;
    }

    async afterInsert(event: InsertEvent<IdentityProviderEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity as IdentityProvider);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as IdentityProvider);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity as IdentityProvider);
    }
}
