/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RoleAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RoleAttributeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class RoleAttributeSubscriber extends EntitySubscriber<RoleAttribute> {
    constructor() {
        super({
            type: EntityType.ROLE_ATTRIBUTE,
            target: RoleAttributeEntity,
            destinations: buildEntityDestinations(EntityType.ROLE_ATTRIBUTE, (data) => [data.realm_id]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
                        key: data.role_id,
                    }),
                ],
            },
        });
    }
}
