/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { PolicyEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class PolicySubscriber extends EntitySubscriber<Policy> {
    constructor() {
        super({
            type: EntityType.POLICY,
            target: PolicyEntity,
            destinations: buildEntityDestinations(EntityType.POLICY),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.POLICY,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
