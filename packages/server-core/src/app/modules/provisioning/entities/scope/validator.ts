/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeValidator } from '@authup/core-kit';
import { Container } from 'validup';

import type { ScopeProvisioningData } from './types.ts';

export class ScopeProvisioningValidator extends Container<ScopeProvisioningData> {
    protected initialize() {
        super.initialize();

        const modeValidator = new ProvisioningStrategyValidator();
        this.mount('mode', modeValidator);

        const attributesValidator = new ScopeValidator();
        this.mount('attributes', attributesValidator);
    }
}
