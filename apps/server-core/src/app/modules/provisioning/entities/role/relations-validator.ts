/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { RoleProvisioningRelations } from './types.ts';

export class RoleProvisioningRelationsValidator extends Container<RoleProvisioningRelations> {
    protected initialize() {
        super.initialize();

        this.mount('realmPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));
    }
}
