/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from 'express';
import { attachControllers } from '@decorators/express';
import { RobotController } from './robot';
import { Oauth2ProviderRoleController } from './oauth2-provide-role';
import { Oauth2ProviderController, registerOauth2ProviderController } from './oauth2-provider';
import { PermissionController } from './permission';
import { RealmController } from './realm';
import { RoleController } from './role';
import { RolePermissionController } from './role-permission';
import { UserController } from './user';
import { UserRoleController } from './user-role';
import { registerTokenController } from './token';
import { ControllerOptions } from './type';

export function registerControllers(
    router: Application,
    options: ControllerOptions,
) {
    attachControllers(router, [
        RobotController,
        Oauth2ProviderRoleController,
        Oauth2ProviderController,
        PermissionController,
        RealmController,
        RoleController,
        RolePermissionController,
        UserController,
        UserRoleController,
    ]);

    registerOauth2ProviderController(router, options);
    registerTokenController(router, options);
}
