/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyValidator } from '@authup/core-kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { createProvisioningEntitiesValidator } from '../utils.ts';
import type { PolicyProvisioningEntity } from './types.ts';

export class PolicyProvisioningValidator extends Container<PolicyProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new PolicyValidator();
        this.mount('attributes', attributesValidator);

        this.mount('extraAttributes', { optional: true }, createValidator(
            z.record(z.string(), z.any()),
        ));

        this.mount('children', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(this)),
        ));
    }
}
