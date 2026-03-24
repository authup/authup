/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Role,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestinations} from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../event-publisher/index.ts';
import { RoleEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: Role,
) {
    const destinations : DomainEventDestinations = [
        {
            channel: (id) => buildEntityChannelName(EntityType.ROLE, id),
        },
    ];
    if (data.realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROLE, id),
            namespace: buildEntityNamespaceName(data.realm_id),
        });
    }
    await publishDomainEvent({
        content: {
            type: EntityType.ROLE,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<Role> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listenTo(): Function | string {
        return RoleEntity;
    }

    async afterInsert(event: InsertEvent<Role>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<Role>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as Role);
    }

    async afterRemove(event: RemoveEvent<Role>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROLE,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
