/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RobotPermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class RobotPermissionSubscriber extends EntitySubscriber<RobotPermission> {
    constructor() {
        super({
            type: EntityType.ROBOT_PERMISSION,
            target: RobotPermissionEntity,
            destinations: buildEntityDestinations(EntityType.ROBOT_PERMISSION, (data) => [
                data.robot_realm_id,
                data.permission_realm_id,
            ]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT_OWNED_PERMISSIONS,
                        key: data.robot_id,
                    }),
                ],
            },
        });
    }
}
