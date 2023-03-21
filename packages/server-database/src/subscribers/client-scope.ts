/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope, SocketEventOperations } from '@authup/common';
import { emitSocketEvent } from '@authup/server-common';
import { buildSocketEntityRoomName } from '@authup/common';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { ClientScopeEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'clientScope'>,
    data: ClientScope,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('clientScope', id),
            },

            // todo: realm attribute
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class ClientScopeSubscriber implements EntitySubscriberInterface<ClientScopeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return ClientScopeEntity;
    }

    afterInsert(event: InsertEvent<ClientScopeEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('clientScopeCreated', event.entity as ClientScope);
    }

    async afterUpdate(event: UpdateEvent<ClientScopeEntity>): Promise<any> {
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

        publishEvent('clientScopeUpdated', event.entity as ClientScope);
    }

    async afterRemove(event: RemoveEvent<ClientScopeEntity>): Promise<any> {
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

        publishEvent('clientScopeDeleted', event.entity as ClientScope);
    }
}
