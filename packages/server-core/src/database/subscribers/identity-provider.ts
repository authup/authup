/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';
import {
    DomainEventName, DomainType, buildDomainChannelName, buildDomainNamespaceName,
} from '@authup/core-kit';
import { publishDomainEvent } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { IdentityProviderEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: IdentityProvider,
) {
    await publishDomainEvent(
        {
            type: DomainType.IDENTITY_PROVIDER,
            event,
            data,
        },
        [
            {
                channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER, id),
                namespace: buildDomainNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER, id),
            },
        ],
    );
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

        await publishEvent(DomainEventName.CREATED, event.entity as IdentityProvider);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderEntity>): Promise<any> {
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

        await publishEvent(DomainEventName.UPDATED, event.entity as IdentityProvider);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderEntity>): Promise<any> {
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

        await publishEvent(DomainEventName.DELETED, event.entity as IdentityProvider);
    }
}
