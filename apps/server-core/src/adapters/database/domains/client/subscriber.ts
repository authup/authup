/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ClientEntity } from './entity.ts';

@EventSubscriber()
export class ClientSubscriber extends EntitySubscriber<Client> {
    constructor() {
        super({
            type: EntityType.CLIENT,
            target: ClientEntity,
            destinations: buildEntityDestinations(EntityType.CLIENT, (data) => [data.realmId]),
        });
    }
}
