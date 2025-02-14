/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientRole,
} from '@authup/core-kit';
import {
    DomainEventName, DomainType,
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
import { CachePrefix, ClientRoleEntity } from '../domains';

async function publishEvent(
    event: `${DomainEventName}`,
    data: ClientRole,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildDomainChannelName(DomainType.CLIENT_ROLE, id) },
    ];
    if (data.client_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.CLIENT_ROLE, id),
            namespace: buildDomainNamespaceName(data.client_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.CLIENT_ROLE, id),
            namespace: buildDomainNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: DomainType.CLIENT_ROLE,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class ClientRoleSubscriber implements EntitySubscriberInterface<ClientRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ClientRoleEntity;
    }

    async afterInsert(event: InsertEvent<ClientRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_ROLES,
                    key: event.entity.client_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<ClientRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_ROLES,
                    key: event.entity.client_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as ClientRoleEntity);
    }

    async afterRemove(event: RemoveEvent<ClientRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT_OWNED_ROLES,
                    key: event.entity.client_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity);
    }
}
