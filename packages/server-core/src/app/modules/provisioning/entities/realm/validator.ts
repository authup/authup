/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { RealmProvisioningRelationsValidator } from './relations-validator.ts';

import type { RealmProvisioningContainer } from './types.ts';

export class RealmProvisioningValidator extends Container<RealmProvisioningContainer> {
    protected initialize() {
        super.initialize();

        const attributesValidator = new RealmValidator();
        const relationsValidator = new RealmProvisioningRelationsValidator();

        this.mount('data', attributesValidator);
        this.mount('relations', relationsValidator);
    }
}
