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
import {
    ClientController,
    ClientScopeController,
    IdentityProviderController,
    OAuth2ProviderRoleController,
    PermissionController,
    PolicyController,
    RealmController,
    RobotController,
    RobotPermissionController,
    RobotRoleController,
    RoleAttributeController,
    RoleController,
    RolePermissionController,
    ScopeController,
    UserAttributeController,
    UserController,
    UserPermissionController,
    UserRoleController,
    registerIdentityProviderController,
} from './entities';
import {
    AuthorizeController, JwkController, OpenIDController, StatusController, TokenController,
} from './workflows';

export function registerControllers(
    router: Router,
) {
    registerIdentityProviderController(router);

    router.use(decorators({
        controllers: [
            AuthorizeController,
            JwkController,
            OpenIDController,
            StatusController,
            TokenController,

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
