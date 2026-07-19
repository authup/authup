/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { UserAttributeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class UserAttributeSubscriber extends EntitySubscriber<UserAttribute> {
    constructor() {
        super({
            type: EntityType.USER_ATTRIBUTE,
            target: UserAttributeEntity,
            destinations: buildEntityDestinations(EntityType.USER_ATTRIBUTE, (data) => [data.realmId]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                        key: data.userId,
                    }),
                ],
            },
        });
    }
}
