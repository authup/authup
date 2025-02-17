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
    ResourceDefaultEventName,
    ResourceType,
    buildResourceChannelName,
    buildResourceNamespaceName,
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
import { CachePrefix, IdentityProviderRoleMappingEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: IdentityProviderRoleMapping,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildResourceChannelName(ResourceType.IDENTITY_PROVIDER_ROLE_MAPPING, id) },
    ];

    if (data.provider_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.IDENTITY_PROVIDER_ROLE_MAPPING, id),
            namespace: buildResourceNamespaceName(data.provider_realm_id),
        });
    }

    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.IDENTITY_PROVIDER_ROLE_MAPPING, id),
            namespace: buildResourceNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: ResourceType.IDENTITY_PROVIDER_ROLE_MAPPING,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class IdentityProviderRoleSubscriber implements EntitySubscriberInterface<IdentityProviderRoleMappingEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderRoleMappingEntity;
    }

    async afterInsert(event: InsertEvent<IdentityProviderRoleMappingEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity as IdentityProviderRoleMapping);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderRoleMappingEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER_ROLE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as IdentityProviderRoleMapping);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderRoleMappingEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.IDENTITY_PROVIDER_ROLE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity as IdentityProviderRoleMapping);
    }
}
