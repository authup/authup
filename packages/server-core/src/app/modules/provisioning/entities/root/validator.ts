/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { PermissionProvisioningValidator } from '../permission/index.ts';
import { RealmProvisioningValidator } from '../realm/index.ts';
import { RoleProvisioningValidator } from '../role/index.ts';
import { ScopeProvisioningValidator } from '../scope/index.ts';

import type { RootProvisioningEntity } from './types.ts';

export class RootProvisioningValidator extends Container<RootProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const realmValidator = new RealmProvisioningValidator();
        const roleValidator = new RoleProvisioningValidator();
        const scopeValidator = new ScopeProvisioningValidator();
        const permissionValidator = new PermissionProvisioningValidator();

        const modeValidator = new ProvisioningStrategyValidator();
        this.mount('mode', modeValidator);

        this.mount('realms', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await realmValidator.run(ctx.value[i]);
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

        this.mount('scopes', { optional: true }, createValidator(
            zod
                .array(zod.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await scopeValidator.run(ctx.value[i]);
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
    }
}
