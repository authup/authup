/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserAttribute,
} from '@authup/core-kit';
import {
    EntityDefaultEventName, EntityType,
    buildEntityChannelName,
    buildEntityNamespaceName,
} from '@authup/core-kit';
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
import { publishDomainEvent } from '../../../domain-event-publisher';
import { UserAttributeEntity } from './entity';
import { CachePrefix } from '../constants';

async function publishEvent(
    event: `${EntityDefaultEventName}`,
    data: UserAttribute,
) {
    await publishDomainEvent({
        content: {
            type: EntityType.USER_ATTRIBUTE,
            event,
            data,
        },
        destinations: [
            {
                channel: (id) => buildEntityChannelName(EntityType.USER_ATTRIBUTE, id),
                namespace: buildEntityNamespaceName(data.realm_id),
            },
            {
                channel: (id) => buildEntityChannelName(EntityType.USER_ATTRIBUTE, id),
            },
        ],
    });
}

@EventSubscriber()
export class UserAttributeSubscriber implements EntitySubscriberInterface<UserAttributeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return UserAttributeEntity;
    }

    async afterInsert(event: InsertEvent<UserAttributeEntity>): Promise<any> {
        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.CREATED, event.entity);

        return Promise.resolve(undefined);
    }

    async afterUpdate(event: UpdateEvent<UserAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.UPDATED, event.entity as UserAttributeEntity);
    }

    async afterRemove(event: RemoveEvent<UserAttributeEntity>): Promise<any> {
        if (!event.entity) {
            return;
        }

        if (event.connection.queryResultCache) {
            await event.connection.queryResultCache.remove([
                buildRedisKeyPath({
                    prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                    key: event.entity.user_id,
                }),
            ]);
        }

        await publishEvent(EntityDefaultEventName.DELETED, event.entity);
    }
}
