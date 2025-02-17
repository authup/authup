/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RobotRole,
} from '@authup/core-kit';
import {
    ResourceDefaultEventName, ResourceType,
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
import { CachePrefix, RobotRoleEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: RobotRole,
) {
    const destinations : DomainEventDestination[] = [
        { channel: (id) => buildResourceChannelName(ResourceType.ROBOT_ROLE, id) },
    ];
    if (data.robot_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.ROBOT_ROLE, id),
            namespace: buildResourceNamespaceName(data.robot_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildResourceChannelName(ResourceType.ROBOT_ROLE, id),
            namespace: buildResourceNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: ResourceType.ROBOT_ROLE,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class RobotRoleSubscriber implements EntitySubscriberInterface<RobotRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RobotRoleEntity;
    }

    async afterInsert(event: InsertEvent<RobotRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    key: event.entity.robot_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RobotRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    key: event.entity.robot_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as RobotRoleEntity);
    }

    async afterRemove(event: RemoveEvent<RobotRoleEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT_OWNED_ROLES,
                    key: event.entity.robot_id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity);
    }
}
