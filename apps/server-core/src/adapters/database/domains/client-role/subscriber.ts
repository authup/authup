/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientRole } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ClientRoleEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class ClientRoleSubscriber extends EntitySubscriber<ClientRole> {
    constructor() {
        super({
            type: EntityType.CLIENT_ROLE,
            target: ClientRoleEntity,
            destinations: buildEntityDestinations(EntityType.CLIENT_ROLE, (data) => [
                data.client_realm_id,
                data.role_realm_id,
            ]),
            cache: {
                onInsert: true,
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT_OWNED_ROLES,
                        key: data.client_id,
                    }),
                ],
            },
        });
    }
}
