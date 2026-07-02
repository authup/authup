/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { PermissionProvisioningValidator } from '../permission/index.ts';
import { RoleProvisioningValidator } from '../role/index.ts';
import { createProvisioningEntitiesValidator } from '../utils.ts';
import type { ClientProvisioningRelations } from './types.ts';

export class ClientProvisioningRelationsValidator extends Container<ClientProvisioningRelations> {
    protected initialize() {
        super.initialize();

        const permissionValidator = new PermissionProvisioningValidator();
        const roleValidator = new RoleProvisioningValidator();

        this.mount('permissions', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(permissionValidator)),
        ));

        this.mount('realmPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('roles', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(roleValidator)),
        ));

        this.mount('realmRoles', { optional: true }, createValidator(
            z.array(z.string()),
        ));

        this.mount('globalRoles', { optional: true }, createValidator(
            z.array(z.string()),
        ));
    }
}
