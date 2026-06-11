/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RobotRoleEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class RobotRoleSubscriber extends EntitySubscriber<RobotRole> {
    constructor() {
        super({
            type: EntityType.ROBOT_ROLE,
            target: RobotRoleEntity,
            destinations: buildEntityDestinations(EntityType.ROBOT_ROLE, (data) => [
                data.robot_realm_id,
                data.role_realm_id,
            ]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT_OWNED_ROLES,
                        key: data.robot_id,
                    }),
                ],
            },
        });
    }
}
