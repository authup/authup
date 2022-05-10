/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSourceOptions } from 'typeorm';
import {
    RobotPermissionSubscriber,
    RobotRoleSubscriber,
    RobotSubscriber,

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
            RobotRoleSubscriber,
            RobotSubscriber,
            RobotPermissionSubscriber,

            RoleSubscriber,
            RolePermissionSubscriber,

            UserRoleSubscriber,
            UserSubscriber,
            UserAttributeSubscriber,
            UserPermissionSubscriber,
            ...(options.subscribers ? options.subscribers : []) as string[],
        ],
    };

    return options;
}
