/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';

import type { ScopeProvisioningEntity } from './types.ts';

export class ScopeProvisioningValidator extends Container<ScopeProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const attributesValidator = new ScopeValidator();
        this.mount('attributes', attributesValidator);
    }
}
