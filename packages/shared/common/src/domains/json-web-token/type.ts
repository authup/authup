/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Robot } from '../robot';
import { OAuth2SubKind } from '../oauth2';

export type JWTPayload = {
    /**
     * Subject (userId | robotId)
     */
    sub?: User['id'] | Robot['id'],

    /**
     * Self: Subject type (robot | user)
     */
    sub_kind?: `${OAuth2SubKind}`,

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
     * OpenID: roles
     */
    roles?: string[],

    /**
     * OpenID: sub active?
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
     * Self: realm_id
     */
    realm_id?: string,

    /**
     * Self: remote address
     */
    remote_address?: string

    /**
     * Additional parameters
     */
    [key: string]: any
};
