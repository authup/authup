/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ClientScopeEntity } from './entity.ts';
import { CachePrefix } from '../constants.ts';

@EventSubscriber()
export class ClientScopeSubscriber extends EntitySubscriber<ClientScope> {
    constructor() {
        super({
            type: EntityType.CLIENT_SCOPE,
            target: ClientScopeEntity,
            destinations: buildEntityDestinations(EntityType.CLIENT_SCOPE),
            cache: {
                keys: (data) => [
                    buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT_SCOPE,
                        key: data.id,
                    }),
                ],
            },
        });
    }
}
