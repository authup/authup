/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Role,
} from '@authup/core';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/core';
import { publishDomainEvent } from '@authup/server-kit';
import type {
    EntitySubscriberInterface,
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { RoleEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: Role,
) {
    await publishDomainEvent(
        {
            type: DomainType.ROLE,
            event,
            data,
        },
        [
            {
                channel: (id) => buildDomainChannelName(DomainType.ROLE, id),
                namespace: buildDomainNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildDomainChannelName(DomainType.ROLE, id),
            },
        ],
    );
}

@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<RoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RoleEntity;
    }

    async afterInsert(event: InsertEvent<RoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(DomainEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as RoleEntity);
    }

    async afterRemove(event: RemoveEvent<RoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROLE,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as RoleEntity);
    }
}
