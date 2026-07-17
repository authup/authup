/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { UserPermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class UserPermissionSubscriber extends EntitySubscriber<UserPermission> {
    constructor() {
        super({
            type: EntityType.USER_PERMISSION,
            target: UserPermissionEntity,
            destinations: buildEntityDestinations(EntityType.USER_PERMISSION, (data) => [
                data.userRealmId,
                data.permissionRealmId,
            ]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_PERMISSIONS,
                        key: data.userId,
                    }),
                ],
            },
        });
    }
}
