/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import { attachControllers } from '@decorators/express';
import { RobotController } from './robot';
import { OAuth2ProviderRoleController } from './identity-provide-role';
import { IdentityProviderController, registerIdentityProviderController } from './identity-provider';
import { PermissionController } from './permission';
import { RealmController } from './realm';
import { RoleController } from './role';
import { RolePermissionController } from './role-permission';
import { UserController } from './user';
import { UserRoleController } from './user-role';
import { AuthController, AuthTokenController } from './auth';
import { RobotPermissionController } from './robot-permission';
import { RobotRoleController } from './robot-role';
import { UserPermissionController } from './user-permission';
import { RoleAttributeController } from './role-attribute';
import { UserAttributeController } from './user-attribute';
import { ClientController } from './client';

export function registerControllers(
    router: Router,
) {
    attachControllers(router, [
        AuthController,
        AuthTokenController,
        ClientController,
        OAuth2ProviderRoleController,
        IdentityProviderController,
        PermissionController,
        RobotController,
        RobotPermissionController,
        RobotRoleController,
        RealmController,
        RoleController,
        RoleAttributeController,
        RolePermissionController,
        UserController,
        UserAttributeController,
        UserPermissionController,
        UserRoleController,
    ]);

    registerIdentityProviderController(router);
}
