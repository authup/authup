/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { RealmEntity } from './entity.ts';

@EventSubscriber()
export class RealmSubscriber extends EntitySubscriber<Realm> {
    constructor() {
        super({
            type: EntityType.REALM,
            target: RealmEntity,
            destinations: buildEntityDestinations(EntityType.REALM),
        });
    }
}
