/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { ClientProvisioningRelationsValidator } from './relations-validator.ts';
import type { ClientProvisioningEntity } from './types.ts';

export class ClientProvisioningValidator extends Container<ClientProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new ClientValidator();
        this.mount('attributes', attributesValidator);

        const relationsValidator = new ClientProvisioningRelationsValidator();
        this.mount('relations', relationsValidator);
    }
}
