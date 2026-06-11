/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAttribute } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { IdentityProviderAttributeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class IdentityProviderAttributeSubscriber extends EntitySubscriber<IdentityProviderAttribute> {
    constructor() {
        super({
            type: EntityType.IDENTITY_PROVIDER_ATTRIBUTE,
            target: IdentityProviderAttributeEntity,
            destinations: buildEntityDestinations(EntityType.IDENTITY_PROVIDER_ATTRIBUTE),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.IDENTITY_PROVIDER_ATTRIBUTE,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
