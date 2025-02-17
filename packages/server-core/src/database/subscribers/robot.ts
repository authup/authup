/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Robot,
} from '@authup/core-kit';
import {
    ResourceDefaultEventName, ResourceType,
    buildResourceChannelName,
    buildResourceNamespaceName,
} from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { publishDomainEvent } from '../../core';
import { CachePrefix, RobotEntity } from '../domains';

async function publishEvent(
    event: `${ResourceDefaultEventName}`,
    data: Robot,
) {
    await publishDomainEvent({
        content: {
            type: ResourceType.ROBOT,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildResourceChannelName(ResourceType.ROBOT, id),
                namespace: buildResourceNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildResourceChannelName(ResourceType.ROBOT, id),
            },
        ],
    });
}

@EventSubscriber()
export class RobotSubscriber implements EntitySubscriberInterface<RobotEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return RobotEntity;
    }

    async afterInsert(event: InsertEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        await publishEvent(ResourceDefaultEventName.CREATED, event.entity as Robot);
    }

    async afterUpdate(event: UpdateEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.UPDATED, event.entity as Robot);
    }

    async afterRemove(event: RemoveEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT,
                    key: event.entity.id,
                }),
            ]);
        }

        await publishEvent(ResourceDefaultEventName.DELETED, event.entity as Robot);
    }
}
