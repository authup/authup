/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProviderRoleMapping,
} from '@authup/core-kit';
import {
    DomainEventName,
    DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/core-kit';
import { DomainEventDestination, buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../core';
import { CachePrefix, IdentityProviderRoleEntity } from '../../domains';

async function publishEvent(
    event: `${DomainEventName}`,
    data: IdentityProviderRoleMapping,
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
        content: {
            type: DomainType.IDENTITY_PROVIDER_ROLE,
            event,
            data,
        },
        destinations,
    });
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

        await publishEvent(DomainEventName.CREATED, event.entity as IdentityProviderRoleMapping);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER_ROLE,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as IdentityProviderRoleMapping);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER_ROLE,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as IdentityProviderRoleMapping);
    }
}
