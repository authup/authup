/*
 * Copyright (c) 2022-2024.
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
    PermissionSubscriber,
    PolicyAttributeSubscriber,
    PolicySubscriber,
    RealmSubscriber,
    RobotPermissionSubscriber,
    RobotRoleSubscriber,
    RobotSubscriber,
    RoleAttributeSubscriber,
    RolePermissionSubscriber,
    RoleSubscriber,

    ScopeSubscriber,
    UserAttributeSubscriber,
    UserPermissionSubscriber,
    UserRoleSubscriber,
    UserSubscriber,
} from '../../subscribers';

export function extendDataSourceOptionsWithSubscribers<T extends DataSourceOptions>(options: T) : T {
    return Object.assign(options, {
        subscribers: [
            ClientSubscriber,
            ClientScopeSubscriber,

            IdentityProviderSubscriber,
            IdentityProviderAccountSubscriber,
            IdentityProviderAttributeSubscriber,
            IdentityProviderRoleSubscriber,

            PermissionSubscriber,
            PolicySubscriber,
            PolicyAttributeSubscriber,

            RealmSubscriber,

            RobotSubscriber,
            RobotRoleSubscriber,
            RobotPermissionSubscriber,

            RoleSubscriber,
            RoleAttributeSubscriber,
            RolePermissionSubscriber,

            ScopeSubscriber,

            UserSubscriber,
            UserAttributeSubscriber,
            UserPermissionSubscriber,
            UserRoleSubscriber,
            ...(options.subscribers ? options.subscribers : []) as string[],
        ],
    });
}
