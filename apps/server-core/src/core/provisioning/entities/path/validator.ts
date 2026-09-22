/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { PathProvisioningAttributesValidator } from './attributes-validator.ts';
import type { PathProvisioningEntity } from './types.ts';

export class PathProvisioningValidator extends Container<PathProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new PathProvisioningAttributesValidator();
        this.mount('attributes', attributesValidator);
    }
}
