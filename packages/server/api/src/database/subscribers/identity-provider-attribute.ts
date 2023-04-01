/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProviderAttribute,
} from '@authup/common';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
} from '@authup/common';
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
import { IdentityProviderAttributeEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: IdentityProviderAttribute,
) {
    await publishDomainEvent(
        {
            type: DomainType.IDENTITY_PROVIDER_ATTRIBUTE,
            event,
            data,
        },
        [
            {
                channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER_ATTRIBUTE, id),
            },

            // todo: realm attribute
        ],
    );
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
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
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
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as IdentityProviderAttribute);
    }
}
