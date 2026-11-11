/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Consent } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ConsentEntity } from './entity.ts';

@EventSubscriber()
export class ConsentEntitySubscriber extends EntitySubscriber<Consent> {
    constructor() {
        super({
            type: EntityType.CONSENT,
            target: ConsentEntity,
            destinations: buildEntityDestinations(EntityType.CONSENT, (data) => [data.realmId]),
        });
    }
}
