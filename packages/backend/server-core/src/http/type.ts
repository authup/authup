/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Express, NextFunction, Request, Response,
} from 'express';
import {
    AbilityManager, OAuth2Client, Realm, Robot, User,
} from '@authelion/common';

export interface ExpressAppInterface extends Express {

}

export interface ExpressRequest extends Request {
    user?: User,
    userId?: User['id'],

    robot?: Robot,
    robotId?: Robot['id'],

    client?: OAuth2Client,
    clientId?: OAuth2Client['id']

    realmId?: Realm['id'],

    token?: string,

    ability: AbilityManager
}

export type ExpressResponseMessage = {
    statusMessage?: string,
    statusCode?: number,
    data?: any
};

export interface ExpressResponse extends Response {
    respond(message?: ExpressResponseMessage): void,

    respondDeleted(message?: ExpressResponseMessage): void,

    respondCreated(message?: ExpressResponseMessage): void,

    respondAccepted(message?: ExpressResponseMessage): void
}

export interface ExpressNextFunction extends NextFunction {

}
