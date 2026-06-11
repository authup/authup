/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { IdentityProviderAccountEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class IdentityProviderAccountSubscriber extends EntitySubscriber<IdentityProviderAccount> {
    constructor() {
        super({
            type: EntityType.IDENTITY_PROVIDER_ACCOUNT,
            target: IdentityProviderAccountEntity,
            destinations: buildEntityDestinations(EntityType.IDENTITY_PROVIDER_ACCOUNT),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.IDENTITY_PROVIDER_ACCOUNT,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
