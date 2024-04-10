/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProviderRole,
} from '@authup/core';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/core';
import type { DomainEventDestination } from '@authup/server-kit';
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
import { IdentityProviderRoleEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: IdentityProviderRole,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER_ROLE, id) },
    ];

    if (data.provider_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER_ROLE, id),
            namespace: buildDomainNamespaceName(data.provider_realm_id),
        });
    }

    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.IDENTITY_PROVIDER_ROLE, id),
            namespace: buildDomainNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        type: DomainType.IDENTITY_PROVIDER_ROLE,
        event,
        data,
    }, destinations);
}

@EventSubscriber()
export class IdentityProviderRoleSubscriber implements EntitySubscriberInterface<IdentityProviderRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderRoleEntity;
    }

    async afterInsert(event: InsertEvent<IdentityProviderRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(DomainEventName.CREATED, event.entity as IdentityProviderRole);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderRoleEntity>): Promise<any> {
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

        await publishEvent(DomainEventName.UPDATED, event.entity as IdentityProviderRole);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderRoleEntity>): Promise<any> {
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

        await publishEvent(DomainEventName.DELETED, event.entity as IdentityProviderRole);
    }
}
