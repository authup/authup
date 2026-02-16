/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ProvisioningStrategyValidator } from '../../strategy/index.ts';
import { PermissionProvisioningValidator } from '../permission/index.ts';
import { RealmProvisioningValidator } from '../realm/index.ts';
import { RoleProvisioningValidator } from '../role/index.ts';
import { ScopeProvisioningValidator } from '../scope/index.ts';

import type { RootProvisioningEntity } from './types.ts';

export class RootProvisioningValidator extends Container<RootProvisioningEntity> {
    protected initialize() {
        super.initialize();

        const strategyValidator = new ProvisioningStrategyValidator();
        this.mount('strategy', { optional: true }, strategyValidator);

        const realmValidator = new RealmProvisioningValidator();
        this.mount('realms', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await realmValidator.run(ctx.value[i]);
                    }
                }),
        ));

        const roleValidator = new RoleProvisioningValidator();
        this.mount('roles', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await roleValidator.run(ctx.value[i]);
                    }
                }),
        ));

        const scopeValidator = new ScopeProvisioningValidator();
        this.mount('scopes', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await scopeValidator.run(ctx.value[i]);
                    }
                }),
        ));

        const permissionValidator = new PermissionProvisioningValidator();
        this.mount('permissions', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    for (let i = 0; i < ctx.value.length; i++) {
                        await permissionValidator.run(ctx.value[i]);
                    }
                }),
        ));
    }
}
