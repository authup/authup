/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import { decorators } from '@routup/decorators';
import {
    useRequestBody,
} from '@routup/basic/body';
import {
    useRequestCookie,
    useRequestCookies,
} from '@routup/basic/cookie';
import {
    useRequestQuery,
} from '@routup/basic/query';
import { ClientScopeController } from './client-scope';
import { PolicyController } from './policy';
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
import { AuthTokenController, RootController } from './root';
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

    router.use(decorators({
        controllers: [
            RootController,
            AuthTokenController,
            ClientController,
            ClientScopeController,
            OAuth2ProviderRoleController,
            IdentityProviderController,
            PermissionController,
            PolicyController,
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
        ],
        parameter: {
            body: (context, name) => {
                if (name) {
                    return useRequestBody(context.request, name);
                }

                return useRequestBody(context.request);
            },
            cookie: (context, name) => {
                if (name) {
                    return useRequestCookie(context.request, name);
                }

                return useRequestCookies(context.request);
            },
            query: (context, name) => {
                if (name) {
                    return useRequestQuery(context.request, name);
                }

                return useRequestQuery(context.request);
            },
        },
    }));
}
