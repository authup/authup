/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, SocketEventOperations } from '@authup/common';
import { emitSocketEvent } from '@authup/server-common';
import { buildSocketEntityRoomName, buildSocketRealmNamespaceName } from '@authup/common';
import type {
    EntitySubscriberInterface, InsertEvent,
    RemoveEvent,
    UpdateEvent,
} from 'typeorm';
import {
    EventSubscriber,
} from 'typeorm';
import { buildKeyPath } from 'redis-extension';
import { IdentityProviderEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'identityProvider'>,
    data: IdentityProvider,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('identityProvider', id),
                namespace: buildSocketRealmNamespaceName(data.realm_id),
            },
            {
                roomNameFn: (id) => buildSocketEntityRoomName('identityProvider', id),
            },
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class IdentityProviderSubscriber implements EntitySubscriberInterface<IdentityProviderEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderEntity;
    }

    afterInsert(event: InsertEvent<IdentityProviderEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('identityProviderCreated', event.entity as IdentityProvider);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderEntity>): Promise<any> {
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

        publishEvent('identityProviderUpdated', event.entity as IdentityProvider);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderEntity>): Promise<any> {
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

        publishEvent('identityProviderDeleted', event.entity as IdentityProvider);
    }
}
