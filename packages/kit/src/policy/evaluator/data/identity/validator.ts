/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import { z } from 'zod';
import type { PolicyIdentity } from '../../../types';

export class PolicyDataIdentityValidator extends Container<PolicyIdentity> {
    constructor(options: ContainerOptions<PolicyIdentity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('type', createValidator(z.string().min(3).max(128)));

        this.mount('id', createValidator(z.string().uuid()));

        this.mount('realmId', createValidator(z.string().uuid().optional()));

        this.mount('realmName', createValidator(z.string().min(3).max(128).optional()));
    }
}
