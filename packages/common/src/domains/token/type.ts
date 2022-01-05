/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionItem } from '@typescript-auth/core';
import { User } from '../user';

type AccessTokenPayload = {
    /**
     * Subject (user id)
     */
    sub: string | number;
    /**
     * Issuer (token endpoint, f.e "https://...")
     */
    iss: string;
    /**
     * client id
     */
    cid: string;
    /**
     * Issued At
     */
    iat: number;
    /**
     * Expires At
     */
    exp: number;
    /**
     * Scopes (f.e: "scope1 scope2")
     */
    scope: string;
    /**
     * Additional parameters
     */
    [key: string]: any;
};

export type Oauth2TokenResponse = {
    access_token: string;
    access_token_payload?: AccessTokenPayload;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    id_token?: string;
    id_token_payload?: Record<string, any>;
    mac_key?: string;
    mac_algorithm?: string;
};

export type TokenPayload = Partial<AccessTokenPayload> & {
    /**
     * remote address
     */
    remoteAddress: string,

    /**
     * Issued at (readonly)
     */
    iat?: number,

    /**
     * Expire at (readonly)
     */
    exp?: number
};

export type TokenVerificationPayload = {
    token: TokenPayload,
    target: {
        type: 'user',
        data: User & {
            permissions: PermissionItem<any>[]
        }
    }
};

export type TokenGrantPayload = {
    username: string,
    password: string
};
