/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { UserRoleEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class UserRoleSubscriber extends EntitySubscriber<UserRole> {
    constructor() {
        super({
            type: EntityType.USER_ROLE,
            target: UserRoleEntity,
            destinations: buildEntityDestinations(EntityType.USER_ROLE, (data) => [
                data.userRealmId,
                data.roleRealmId,
            ]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ROLES,
                        key: data.userId,
                    }),
                ],
            },
        });
    }
}
