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
import { RobotPermissionController } from './robot-permission';
import { RobotRoleController } from './robot-role';
import { UserPermissionController } from './user-permission';
import { RoleAttributeController } from './role-attribute';
import { UserAttributeController } from './user-attribute';
import { Config } from '../../config';

export function registerControllers(
    router: Application,
    config?: Config,
) {
    attachControllers(router, [
        Oauth2ProviderRoleController,
        Oauth2ProviderController,
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

    registerOauth2ProviderController(router, config);
    registerTokenController(router, config);
}
