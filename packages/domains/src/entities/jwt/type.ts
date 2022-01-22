/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenSubKind } from '../oauth2-access-token';
import { User } from '../user';
import { Robot } from '../robot';

export type JWTPayload = {
    /**
     * Subject (userId | robotId)
     */
    sub?: User['id'] | Robot['id'],

    /**
     * Subject type (robot | user)
     */
    sub_kind?: OAuth2AccessTokenSubKind.USER |
    OAuth2AccessTokenSubKind.ROBOT,

    /**
     * Audience
     */
    aud?: string,

    /**
     * Issuer (token endpoint, f.e "https://...")
     */
    iss?: string,

    /**
     * Expires At
     */
    exp: number,

    /**
     * Not before
     */
    nbf?: number,

    /**
     * Issued At
     */
    iat?: number,

    /**
     * (JWT ID) Claim
     */
    jti?: string | number,

    /**
     * Scopes (f.e: "scope1 scope2")
     */
    scope?: string,

    /**
     * client id
     */
    client_id?: string,

    /**
     * roles
     */
    roles?: string[],

    /**
     * sub active?
     */
    active?: boolean;

    /**
     * OpenID: email
     */
    email?: string;

    /**
     * OpenID: email_verified
     */
    email_verified?: boolean;

    /**
     * OpenID: preferred_username
     */
    preferred_username?: string

    /**
     * OpenID: nickname
     */
    nickname?: string

    /**
     * remote address
     */
    remote_address?: string

    /**
     * Additional parameters
     */
    [key: string]: any
};
