/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionValidator } from '@authup/core-kit';
import { Container } from 'validup';

import type { PermissionProvisioningContainer } from './types.ts';

export class PermissionProvisioningValidator extends Container<PermissionProvisioningContainer> {
    protected initialize() {
        const attributesValidator = new PermissionValidator();
        this.mount('data', attributesValidator);
    }
}
