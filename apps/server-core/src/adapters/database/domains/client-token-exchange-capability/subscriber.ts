/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ClientTokenExchangeCapabilityEntity } from './entity.ts';

@EventSubscriber()
export class ClientTokenExchangeCapabilitySubscriber extends EntitySubscriber<ClientTokenExchangeCapability> {
    constructor() {
        super({
            type: EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY,
            target: ClientTokenExchangeCapabilityEntity,
            destinations: buildEntityDestinations(EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY, (data) => [data.realmId]),
        });
    }
}
