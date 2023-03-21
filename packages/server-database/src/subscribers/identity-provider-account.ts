/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount, SocketEventOperations } from '@authup/common';
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
import { IdentityProviderAccountEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'identityProviderAccount'>,
    data: IdentityProviderAccount,
) {
    emitSocketEvent({
        destinations: [
            {
                roomNameFn: (id) => buildSocketEntityRoomName('identityProviderAccount', id),
            },
        ],
        operation,
        data,
    });
}

@EventSubscriber()
export class IdentityProviderAccountSubscriber implements EntitySubscriberInterface<IdentityProviderAccountEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderAccountEntity;
    }

    afterInsert(event: InsertEvent<IdentityProviderAccountEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('identityProviderAccountCreated', event.entity as IdentityProviderAccount);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderAccountEntity>): Promise<any> {
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

        publishEvent('identityProviderAccountUpdated', event.entity as IdentityProviderAccount);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderAccountEntity>): Promise<any> {
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

        publishEvent('identityProviderAccountDeleted', event.entity as IdentityProviderAccount);
    }
}
