/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { PolicyAttributeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class PolicyAttributeSubscriber extends EntitySubscriber<PolicyAttribute> {
    constructor() {
        super({
            type: EntityType.POLICY_ATTRIBUTE,
            target: PolicyAttributeEntity,
            destinations: buildEntityDestinations(EntityType.POLICY_ATTRIBUTE, (data) => [data.realm_id]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
                        key: data.policy_id,
                    }),
                ],
            },
        });
    }
}
