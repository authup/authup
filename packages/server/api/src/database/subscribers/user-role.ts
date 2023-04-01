/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserRole,
} from '@authup/common';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/common';
import type { DomainEventDestination } from '@authup/server-common';
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
import { UserRoleEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: UserRole,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildDomainChannelName(DomainType.USER_ROLE, id) },
    ];
    if (data.user_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.USER_ROLE, id),
            namespace: buildDomainNamespaceName(data.user_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildDomainChannelName(DomainType.USER_ROLE, id),
            namespace: buildDomainNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        type: DomainType.USER_ROLE,
        event,
        data,
    }, destinations);
}

@EventSubscriber()
export class UserRoleSubscriber implements EntitySubscriberInterface<UserRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserRoleEntity;
    }

    async afterInsert(event: InsertEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    id: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    id: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as UserRoleEntity);
    }

    async afterRemove(event: RemoveEvent<UserRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    id: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity);
    }
}
