/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RobotValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { RobotProvisioningRelationsValidator } from './relations-validator.ts';
import type { RobotProvisioningEntity } from './types.ts';

export class RobotProvisioningValidator extends Container<RobotProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', strategyValidator);

        const attributesValidator = new RobotValidator();
        this.mount('data', attributesValidator);

        const relationsValidator = new RobotProvisioningRelationsValidator();
        this.mount('relations', relationsValidator);
    }
}
