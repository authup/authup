/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, SocketEventOperations } from '@authup/common';
import { buildSocketEntityRoomName, buildSocketRealmNamespaceName } from '@authup/common';
import { emitSocketEvent } from '@authup/server-common';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { ClientEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'client'>,
    data: Client,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('client', id),
                namespace: buildSocketRealmNamespaceName(data.realm_id),
            },
            {
                roomNameFn: (id) => buildSocketEntityRoomName('client', id),
            },
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class ClientSubscriber implements EntitySubscriberInterface<ClientEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ClientEntity;
    }

    afterInsert(event: InsertEvent<ClientEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('clientCreated', event.entity as Client);
    }

    async afterUpdate(event: UpdateEvent<ClientEntity>): Promise<any> {
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

        publishEvent('clientUpdated', event.entity as Client);
    }

    async afterRemove(event: RemoveEvent<ClientEntity>): Promise<any> {
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

        publishEvent('clientDeleted', event.entity as Client);
    }
}
