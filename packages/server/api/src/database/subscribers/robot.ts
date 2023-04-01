/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Robot,
} from '@authup/common';
import {
    DomainEventName, DomainType,
    buildDomainChannelName,
    buildDomainNamespaceName,
} from '@authup/common';
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
import { RobotEntity } from '../../domains';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${DomainEventName}`,
    data: Robot,
) {
    await publishDomainEvent(
        {
            type: DomainType.ROBOT,
            event,
            data,
        },
        [
            {
                channel: (id) => buildDomainChannelName(DomainType.ROBOT, id),
                namespace: buildDomainNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildDomainChannelName(DomainType.ROBOT, id),
            },
        ],
    );
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

        await publishEvent(DomainEventName.CREATED, event.entity as Robot);
    }

    async afterUpdate(event: UpdateEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.UPDATED, event.entity as Robot);
    }

    async afterRemove(event: RemoveEvent<RobotEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.ROBOT,
                    id: event.entity.id,
                }),
            ]);
        }

        await publishEvent(DomainEventName.DELETED, event.entity as Robot);
    }
}
