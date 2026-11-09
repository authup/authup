/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientTokenExchangeCapabilityValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import type { ClientTokenExchangeCapabilityProvisioningEntity } from './types.ts';

export class ClientTokenExchangeCapabilityProvisioningValidator extends Container<ClientTokenExchangeCapabilityProvisioningEntity> {
    protected initialize() {
        super.initialize();

        this.mount('strategy', { optional: true }, new ProvisioningStrategyValidator());

        this.mount('attributes', new ClientTokenExchangeCapabilityValidator());
    }
}
