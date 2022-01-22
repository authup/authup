/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Oauth2Client } from '../oauth2-client';
import { Robot } from '../robot';
import { OAuth2AccessTokenSubKind } from './constants';

export interface OAuth2AccessToken {
    id: string,

    token: string,

    client_id: Oauth2Client['id'] | null,

    client: Oauth2Client | null,

    user_id: User['id'] | null,

    user: User | null,

    robot_id: Robot['id'] | null,

    robot: Robot | null,

    expires: Date,

    scope: string | null
}

export type OAuth2AccessTokenSubKindType = `${OAuth2AccessTokenSubKind}`;

export type OAuth2AccessTokenPayload = {
    /**
     * Subject (user id)
     */
    sub: string | number,
    /**
     * Issuer (token endpoint, f.e "https://...")
     */
    iss: string,
    /**
     * client id
     */
    cid: string,

    /**
     * Issued At
     */
    iat: number,

    /**
     * Expires At
     */
    exp: number,

    /**
     * Scopes (f.e: "scope1 scope2")
     */
    scope: string,

    /**
     * remote address
     */
    remote_address?: string,

    /**
     * iss type
     */
    sub_kind?: OAuth2AccessTokenSubKindType,

    /**
     * Additional parameters
     */
    [key: string]: any
};
