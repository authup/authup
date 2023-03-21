/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';
import {
    ClientScopeSubscriber,
    ClientSubscriber,
    IdentityProviderAccountSubscriber,

    IdentityProviderAttributeSubscriber,
    IdentityProviderRoleSubscriber,

    IdentityProviderSubscriber,
    RobotPermissionSubscriber,
    RobotRoleSubscriber,
    RobotSubscriber, RoleAttributeSubscriber,
    RolePermissionSubscriber,
    RoleSubscriber,

    UserAttributeSubscriber,
    UserPermissionSubscriber,
    UserRoleSubscriber,
    UserSubscriber,
} from '../subscribers';

export function setSubscribersForDataSourceOptions<T extends DataSourceOptions>(options: T) : T {
    options = {
        ...options,
        subscribers: [
            ClientSubscriber,
            ClientScopeSubscriber,

            IdentityProviderSubscriber,
            IdentityProviderAccountSubscriber,
            IdentityProviderAttributeSubscriber,
            IdentityProviderRoleSubscriber,

            RobotSubscriber,
            RobotRoleSubscriber,
            RobotPermissionSubscriber,

            RoleSubscriber,
            RoleAttributeSubscriber,
            RolePermissionSubscriber,

            UserSubscriber,
            UserAttributeSubscriber,
            UserPermissionSubscriber,
            UserRoleSubscriber,
            ...(options.subscribers ? options.subscribers : []) as string[],
        ],
    };

    return options;
}
