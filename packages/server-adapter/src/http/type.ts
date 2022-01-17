/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NextFunction, Request } from 'express';
import { Realm, Robot, User } from '@typescript-auth/domains';
import { AbilityManager, PermissionItem } from '@typescript-auth/core';

export interface ExpressRequest extends Request {
    user?: User,
    userId?: User['id'],

    robot?: Robot,
    robotId?: Robot['id'],

    realmId?: Realm['id'],

    token?: string,

    ability: AbilityManager,
    permissions: PermissionItem<any>[],
}

export interface ExpressResponse extends Response {

}

export interface ExpressNextFunction extends NextFunction {

}
