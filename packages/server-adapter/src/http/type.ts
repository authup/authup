/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm, Robot, User } from '@typescript-auth/domains';
import { AbilityManager, PermissionItem } from '@typescript-auth/core';

export type ExpressRequest = {
    user?: User,
    userId?: User['id'],

    robot?: Robot,
    robotId?: Robot['id'],

    realmId?: Realm['id'],

    token?: string,

    ability: AbilityManager,
    permissions: PermissionItem<any>[],

    // Express
    headers: Record<string, any>,
    [key: string]: any
};

export type ExpressResponse = {
    [key: string]: any
};

export type ExpressNextFunction = {
    (err?: any): void;

    [key: string]: any;
};
