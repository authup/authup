/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientRole,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
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
import { publishDomainEvent } from '../../event-publisher';
import { CachePrefix } from '../constants';
import { ClientRoleEntity } from './entity';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: ClientRole,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildEntityChannelName(EntityType.CLIENT_ROLE, id) },
    ];
    if (data.client_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.CLIENT_ROLE, id),
            namespace: buildEntityNamespaceName(data.client_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.CLIENT_ROLE, id),
            namespace: buildEntityNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.CLIENT_ROLE,
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

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
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

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as ClientRoleEntity);
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

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
