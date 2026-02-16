/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { UserProvisioningRelationsValidator } from './relations-validator.ts';
import type { UserProvisioningEntity } from './types.ts';

export class UserProvisioningValidator extends Container<UserProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', strategyValidator);

        const attributesValidator = new UserValidator();
        this.mount('attributes', attributesValidator);

        const relationsValidator = new UserProvisioningRelationsValidator();
        this.mount('relations', relationsValidator);
    }
}
