/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { UserProvisioningRelationsValidator } from './relations-validator.ts';
import type { UserProvisioningData } from './types.ts';

export class UserProvisioningValidator extends Container<UserProvisioningData> {
    protected initialize() {
        super.initialize();

        const attributesValidator = new UserValidator();
        const relationsValidator = new UserProvisioningRelationsValidator();

        this.mount('attributes', attributesValidator);
        this.mount('relations', relationsValidator);
    }
}
