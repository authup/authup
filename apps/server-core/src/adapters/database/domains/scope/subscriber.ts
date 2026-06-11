/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ScopeEntity } from './entity.ts';

@EventSubscriber()
export class ScopeSubscriber extends EntitySubscriber<Scope> {
    constructor() {
        super({
            type: EntityType.SCOPE,
            target: ScopeEntity,
            destinations: buildEntityDestinations(EntityType.SCOPE, (data) => [data.realm_id]),
        });
    }
}
