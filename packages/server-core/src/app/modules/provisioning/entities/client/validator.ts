/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientValidator } from '@authup/core-kit';
import { Container } from 'validup';
import { ClientProvisioningRelationsValidator } from './relations-validator.ts';
import type { ClientProvisioningContainer } from './types.ts';

export class ClientProvisioningValidator extends Container<ClientProvisioningContainer> {
    protected initialize() {
        const attributesValidator = new ClientValidator();
        const relationsValidator = new ClientProvisioningRelationsValidator();

        this.mount('data', attributesValidator);
        this.mount('relations', relationsValidator);
    }
}
