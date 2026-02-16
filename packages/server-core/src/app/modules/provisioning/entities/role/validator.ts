/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RoleValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { RoleProvisioningRelationsValidator } from './relations-validator.ts';

import type { RoleProvisioningEntity } from './types.ts';

export class RoleProvisioningValidator extends Container<RoleProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const dataValidator = new RoleValidator();
        this.mount('attributes', dataValidator);

        const relationsValidator = new RoleProvisioningRelationsValidator();
        this.mount('relations', relationsValidator);
    }
}
