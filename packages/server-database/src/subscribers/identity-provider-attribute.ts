/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAttribute, SocketEventOperations } from '@authup/common';
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
import { IdentityProviderAttributeEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'identityProviderAttribute'>,
    data: IdentityProviderAttribute,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('identityProviderAttribute', id),
            },

            // todo: realm attribute
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class IdentityProviderAttributeSubscriber implements EntitySubscriberInterface<IdentityProviderAttributeEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderAttributeEntity;
    }

    afterInsert(event: InsertEvent<IdentityProviderAttributeEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('identityProviderAttributeCreated', event.entity as IdentityProviderAttribute);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderAttributeEntity>): Promise<any> {
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

        publishEvent('identityProviderAttributeUpdated', event.entity as IdentityProviderAttribute);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderAttributeEntity>): Promise<any> {
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

        publishEvent('identityProviderAttributeDeleted', event.entity as IdentityProviderAttribute);
    }
}
