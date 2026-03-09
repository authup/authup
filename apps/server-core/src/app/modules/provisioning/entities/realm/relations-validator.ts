/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildZodIssuesForError, createValidator } from '@validup/adapter-zod';
import { Container, isValidupError } from 'validup';
import { z } from 'zod';
import { ClientProvisioningValidator } from '../client/index.ts';
import { PermissionProvisioningValidator } from '../permission/index.ts';
import { RobotProvisioningValidator } from '../robot/index.ts';
import { RoleProvisioningValidator } from '../role/index.ts';
import { ScopeProvisioningValidator } from '../scope/index.ts';
import { UserProvisioningValidator } from '../user/index.ts';
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
                .check(async (ctx) => {
                    try {
                        for (let i = 0; i < ctx.value.length; i++) {
                            await clientValidator.run(ctx.value[i]);
                        }
                    } catch (e) {
                        if (isValidupError(e)) {
                            ctx.issues.push(...buildZodIssuesForError(e));
                        }
                    }
                }),
        ));

        this.mount('roles', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    try {
                        for (let i = 0; i < ctx.value.length; i++) {
                            await roleValidator.run(ctx.value[i]);
                        }
                    } catch (e) {
                        if (isValidupError(e)) {
                            ctx.issues.push({
                                code: 'custom', message: '', path: [], input: undefined,
                            });
                            ctx.issues.push(...buildZodIssuesForError(e));
                        }
                    }
                }),
        ));

        this.mount('permissions', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    try {
                        for (let i = 0; i < ctx.value.length; i++) {
                            await permissionValidator.run(ctx.value[i]);
                        }
                    } catch (e) {
                        if (isValidupError(e)) {
                            ctx.issues.push(...buildZodIssuesForError(e));
                        }
                    }
                }),
        ));

        this.mount('robots', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    try {
                        for (let i = 0; i < ctx.value.length; i++) {
                            await robotValidator.run(ctx.value[i]);
                        }
                    } catch (e) {
                        if (isValidupError(e)) {
                            ctx.issues.push(...buildZodIssuesForError(e));
                        }
                    }
                }),
        ));

        this.mount('scopes', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    try {
                        for (let i = 0; i < ctx.value.length; i++) {
                            await scopeValidator.run(ctx.value[i]);
                        }
                    } catch (e) {
                        if (isValidupError(e)) {
                            ctx.issues.push(...buildZodIssuesForError(e));
                        }
                    }
                }),
        ));

        this.mount('users', { optional: true }, createValidator(
            z
                .array(z.any())
                .check(async (ctx) => {
                    try {
                        for (let i = 0; i < ctx.value.length; i++) {
                            await userValidator.run(ctx.value[i]);
                        }
                    } catch (e) {
                        if (isValidupError(e)) {
                            ctx.issues.push(...buildZodIssuesForError(e));
                        }
                    }
                }),
        ));
    }
}
