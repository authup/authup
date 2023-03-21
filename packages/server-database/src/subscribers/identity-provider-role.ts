/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRole, SocketEventOperations } from '@authup/common';
import type { SocketEmitterEventDestination } from '@authup/server-common';
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
import { IdentityProviderRoleEntity } from '../domains';
import { CachePrefix } from '../constants';

function publishEvent(
    operation: SocketEventOperations<'identityProviderRole'>,
    data: IdentityProviderRole,
) {
    const destinations : SocketEmitterEventDestination[] = [
        { roomNameFn: (id) => buildSocketEntityRoomName('identityProviderRole', id) },
    ];

    if (data.provider_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('identityProviderRole', id),
            namespace: buildSocketRealmNamespaceName(data.provider_realm_id),
        });
    }

    if (data.role_realm_id) {
        destinations.push({
            roomNameFn: (id) => buildSocketEntityRoomName('identityProviderRole', id),
            namespace: buildSocketRealmNamespaceName(data.role_realm_id),
        });
    }
    emitSocketEvent({
        destinations,
        operation,
        data,
    });
}

@EventSubscriber()
export class IdentityProviderRoleSubscriber implements EntitySubscriberInterface<IdentityProviderRoleEntity> {
    // eslint-disable-next-line @typescript-eslint/ban-types
    listenTo(): Function | string {
        return IdentityProviderRoleEntity;
    }

    afterInsert(event: InsertEvent<IdentityProviderRoleEntity>): Promise<any> | void {
        if (!event.entity) {
            return;
        }

        publishEvent('identityProviderRoleCreated', event.entity as IdentityProviderRole);
    }

    async afterUpdate(event: UpdateEvent<IdentityProviderRoleEntity>): Promise<any> {
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

        publishEvent('identityProviderRoleUpdated', event.entity as IdentityProviderRole);
    }

    async afterRemove(event: RemoveEvent<IdentityProviderRoleEntity>): Promise<any> {
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

        publishEvent('identityProviderRoleDeleted', event.entity as IdentityProviderRole);
    }
}
