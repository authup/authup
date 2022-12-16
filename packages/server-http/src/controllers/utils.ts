/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import { mountControllers } from '@routup/decorators';
import { ClientScopeController } from './client-scope';
import { RobotController } from './robot';
import { OAuth2ProviderRoleController } from './identity-provide-role';
import { IdentityProviderController, registerIdentityProviderController } from './identity-provider';
import { PermissionController } from './permission';
import { RealmController } from './realm';
import { RoleController } from './role';
import { RolePermissionController } from './role-permission';
import { ScopeController } from './scope';
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
    registerIdentityProviderController(router);

    mountControllers(router, [
        AuthController,
        AuthTokenController,
        ClientController,
        ClientScopeController,
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
        ScopeController,
        UserController,
        UserAttributeController,
        UserPermissionController,
        UserRoleController,
    ]);
}
