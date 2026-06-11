/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { IdentityProviderRoleMappingEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class IdentityProviderRoleSubscriber extends EntitySubscriber<IdentityProviderRoleMapping> {
    constructor() {
        super({
            type: EntityType.IDENTITY_PROVIDER_ROLE_MAPPING,
            target: IdentityProviderRoleMappingEntity,
            destinations: buildEntityDestinations(EntityType.IDENTITY_PROVIDER_ROLE_MAPPING, (data) => [
                data.provider_realm_id,
                data.role_realm_id,
            ]),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.IDENTITY_PROVIDER_ROLE,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
