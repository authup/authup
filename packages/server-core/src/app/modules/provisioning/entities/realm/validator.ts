/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { RealmProvisioningRelationsValidator } from './relations-validator.ts';

import type { RealmProvisioningEntity } from './types.ts';

export class RealmProvisioningValidator extends Container<RealmProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new RealmValidator();
        this.mount('attributes', attributesValidator);

        const relationsValidator = new RealmProvisioningRelationsValidator();
        this.mount('relations', relationsValidator);
    }
}
