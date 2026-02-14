/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RobotValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { RobotProvisioningRelationsValidator } from './relations-validator.ts';
import type { RobotProvisioningContainer } from './types.ts';

export class RobotProvisioningValidator extends Container<RobotProvisioningContainer> {
    protected initialize() {
        const attributesValidator = new RobotValidator();
        const relationsValidator = new RobotProvisioningRelationsValidator();

        this.mount('data', attributesValidator);
        this.mount('relations', relationsValidator);
    }
}
