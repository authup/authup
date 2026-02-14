/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { PermissionProvisioningValidator } from '../permission';
import { RoleProvisioningValidator } from '../role';
import type { ClientProvisioningRelations } from './types.ts';

export class ClientProvisioningRelationsValidator extends Container<ClientProvisioningRelations> {
    protected initialize() {
        const permissionValidator = new PermissionProvisioningValidator();
        const roleValidator = new RoleProvisioningValidator();

        this.mount('permissions.*', { optional: true }, permissionValidator);

        this.mount('realmPermissions', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('roles.*', { optional: true }, roleValidator);

        this.mount('realmRoles', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('globalRoles', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));
    }
}
