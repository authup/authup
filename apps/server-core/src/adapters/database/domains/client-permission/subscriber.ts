/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ClientPermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class ClientPermissionSubscriber extends EntitySubscriber<ClientPermission> {
    constructor() {
        super({
            type: EntityType.CLIENT_PERMISSION,
            target: ClientPermissionEntity,
            destinations: buildEntityDestinations(EntityType.CLIENT_PERMISSION, (data) => [
                data.client_realm_id,
                data.permission_realm_id,
            ]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT_OWNED_PERMISSIONS,
                        key: data.client_id,
                    }),
                ],
            },
        });
    }
}
