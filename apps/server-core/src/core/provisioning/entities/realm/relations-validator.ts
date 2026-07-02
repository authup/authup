/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ClientProvisioningValidator } from '../client/index.ts';
import { PermissionProvisioningValidator } from '../permission/index.ts';
import { RobotProvisioningValidator } from '../robot/index.ts';
import { RoleProvisioningValidator } from '../role/index.ts';
import { ScopeProvisioningValidator } from '../scope/index.ts';
import { UserProvisioningValidator } from '../user/index.ts';
import { createProvisioningEntitiesValidator } from '../utils.ts';
import type { RealmProvisioningRelations } from './types.ts';

export class RealmProvisioningRelationsValidator extends Container<RealmProvisioningRelations> {
    protected initialize() {
        super.initialize();

        const clientValidator = new ClientProvisioningValidator();
        const roleValidator = new RoleProvisioningValidator();
        const permissionValidator = new PermissionProvisioningValidator();
        const robotValidator = new RobotProvisioningValidator();
        const scopeValidator = new ScopeProvisioningValidator();
        const userValidator = new UserProvisioningValidator();

        this.mount('clients', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(clientValidator)),
        ));

        this.mount('roles', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(roleValidator)),
        ));

        this.mount('permissions', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(permissionValidator)),
        ));

        this.mount('robots', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(robotValidator)),
        ));

        this.mount('scopes', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(scopeValidator)),
        ));

        this.mount('users', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(createProvisioningEntitiesValidator(userValidator)),
        ));
    }
}
