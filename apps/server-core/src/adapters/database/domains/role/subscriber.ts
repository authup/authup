/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RoleEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class RoleSubscriber extends EntitySubscriber<Role> {
    constructor() {
        super({
            type: EntityType.ROLE,
            target: RoleEntity,
            destinations: buildEntityDestinations(EntityType.ROLE, (data) => [data.realm_id]),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.ROLE,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
