/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { ClientTokenExchangePolicyEntity } from './entity.ts';

@EventSubscriber()
export class ClientTokenExchangePolicySubscriber extends EntitySubscriber<ClientTokenExchangePolicy> {
    constructor() {
        super({
            type: EntityType.CLIENT_TOKEN_EXCHANGE_POLICY,
            target: ClientTokenExchangePolicyEntity,
            destinations: buildEntityDestinations(EntityType.CLIENT_TOKEN_EXCHANGE_POLICY, (data) => [data.realmId]),
        });
    }
}
