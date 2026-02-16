/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { UserProvisioningRelations } from './types.ts';

export class UserProvisioningRelationsValidator extends Container<UserProvisioningRelations> {
    protected initialize() {
        super.initialize();

        this.mount('clientPermissions', { optional: true }, createValidator(
            z.record(z.string(), z.array(z.string())),
        ));

        this.mount('realmPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('clientRoles', { optional: true }, createValidator(
            z.record(z.string(), z.array(z.string())),
        ));

        this.mount('realmRoles', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalRoles', { optional: true }, createValidator(
            z.array(z.string()),
        ));
    }
}
