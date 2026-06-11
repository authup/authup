/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildPermissionKey } from '@authup/access';
import type { Permission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { PermissionEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class PermissionSubscriber extends EntitySubscriber<Permission> {
    constructor() {
        super({
            type: EntityType.PERMISSION,
            target: PermissionEntity,
            destinations: buildEntityDestinations(EntityType.PERMISSION),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.PERMISSION,
                        key: data.id,
                    }),
                    buildRedisKeyPath({
                        prefix: CachePrefix.PERMISSION,
                        key: buildPermissionKey({
                            name: data.name,
                            client_id: data.client_id,
                            realm_id: data.realm_id,
                        }),
                    }),
                ],
            },
        });
    }
}
