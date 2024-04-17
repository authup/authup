/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import { DomainEventName, DomainType, buildDomainChannelName } from '@authup/core-kit';
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
import { IdentityProviderAccountEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: IdentityProviderAccount,
) {
    await publishDomainEvent({
        type: DomainType.IDENTITY_PROVIDER_ACCOUNT,
        event,
        data,
    }, [
        {
            channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER_ACCOUNT, id),
        },
    ]);
}

@EventSubscriber()
export class IdentityProviderAccountSubscriber implements EntitySubscriberInterface<IdentityProviderAccountEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderAccountEntity;
    }

    async afterInsert(event: InsertEvent<IdentityProviderAccountEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(DomainEventName.CREATED, event.entity as IdentityProviderAccount);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderAccountEntity>): Promise<any> {
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

        await publishEvent(DomainEventName.UPDATED, event.entity as IdentityProviderAccount);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderAccountEntity>): Promise<any> {
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

        await publishEvent(DomainEventName.DELETED, event.entity as IdentityProviderAccount);
    }
}
