/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RobotEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class RobotSubscriber extends EntitySubscriber<Robot> {
    constructor() {
        super({
            type: EntityType.ROBOT,
            target: RobotEntity,
            destinations: buildEntityDestinations(EntityType.ROBOT, (data) => [data.realm_id]),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
