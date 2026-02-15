/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RoleValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { RoleProvisioningRelationsValidator } from './relations-validator.ts';

import type { RoleProvisioningData } from './types.ts';

export class RoleProvisioningValidator extends Container<RoleProvisioningData> {
    protected initialize() {
        super.initialize();

        const dataValidator = new RoleValidator();
        this.mount('attributes', dataValidator);

        const relationsValidator = new RoleProvisioningRelationsValidator();
        this.mount('relations', relationsValidator);
    }
}
