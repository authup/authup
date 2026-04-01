/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotRole, } from '@authup/core-kit';
import {
    EntityDefaultEventName, 
    EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
} from '@authup/core-kit';
import type { DomainEventDestination } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, 
    InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import { EventSubscriber, } from 'typeorm';
import { publishDomainEvent } from '../../event-publisher/index.ts';
import { CachePrefix } from '../constants.ts';
import { RobotRoleEntity } from './entity.ts';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: RobotRole,
) {
    const destinations : DomainEventDestination[] = [
        {
            channel: (id) => buildEntityChannelName(EntityType.ROBOT_ROLE, id) 
        },
    ];
    if (data.robot_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROBOT_ROLE, id),
            namespace: buildEntityNamespaceName(data.robot_realm_id),
        });
    }
    if (data.role_realm_id) {
        destinations.push({
            channel: (id) => buildEntityChannelName(EntityType.ROBOT_ROLE, id),
            namespace: buildEntityNamespaceName(data.role_realm_id),
        });
    }

    await publishDomainEvent({
        content: {
            type: EntityType.ROBOT_ROLE,
            event,
            data,
        },
        destinations,
    });
}

@EventSubscriber()
export class RobotRoleSubscriber implements EntitySubscriberInterface<RobotRole> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    listenTo(): Function | string {
        return RobotRoleEntity;
    }

    async afterInsert(event: InsertEvent<RobotRole>): Promise<any> {
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

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);
    }

    async afterUpdate(event: UpdateEvent<RobotRole>): Promise<any> {
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

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as RobotRole);
    }

    async afterRemove(event: RemoveEvent<RobotRole>): Promise<any> {
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

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
