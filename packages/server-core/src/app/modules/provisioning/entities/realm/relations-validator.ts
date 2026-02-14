/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { ClientProvisioningValidator } from '../client';
import { PermissionProvisioningValidator } from '../permission';
import { RobotProvisioningValidator } from '../robot';
import { RoleProvisioningValidator } from '../role';
import { UserProvisioningValidator } from '../user';
import type { RealmProvisioningRelations } from './types.ts';

export class RealmProvisioningRelationsValidator extends Container<RealmProvisioningRelations> {
    protected initialize() {
        const clientValidator = new ClientProvisioningValidator();
        const roleValidator = new RoleProvisioningValidator();
        const permissionValidator = new PermissionProvisioningValidator();
        const robotValidator = new RobotProvisioningValidator();
        const userValidator = new UserProvisioningValidator();

        this.mount('clients', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await clientValidator.run(ctx.value[i]);
                    }
                }),
        ));

        this.mount('roles', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await roleValidator.run(ctx.value[i]);
                    }
                }),
        ));

        this.mount('permissions', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await permissionValidator.run(ctx.value[i]);
                    }
                }),
        ));

        this.mount('robots', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await robotValidator.run(ctx.value[i]);
                    }
                }),
        ));

        this.mount('users', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await userValidator.run(ctx.value[i]);
                    }
                }),
        ));
    }
}
