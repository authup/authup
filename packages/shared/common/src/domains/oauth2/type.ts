/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JwtPayload } from 'jsonwebtoken';
import { OAuth2TokenGrant } from '../access-token';
import { AbilityDescriptor } from '../../ability-manager';
import { OAuth2SubKind, OAuth2TokenKind } from './constants';

export type OAuth2PasswordGrantPayload = {
    grant_type?: OAuth2TokenGrant.PASSWORD,
    username: string,
    password: string
};

export type OAuth2RefreshTokenGrantPayload = {
    grant_type?: OAuth2TokenGrant.REFRESH_TOKEN,
    refresh_token: string
};

export type OAuth2RobotCredentialsGrantPayload = {
    grant_type?: OAuth2TokenGrant.ROBOT_CREDENTIALS,
    id: string,
    secret: string
};

export type OAuth2GrantPayload = OAuth2PasswordGrantPayload |
OAuth2RefreshTokenGrantPayload |
OAuth2RobotCredentialsGrantPayload;

export type OAuth2TokenGrantResponse = {
    access_token: string,

    refresh_token?: string,

    expires_in: number,

    token_type: string,

    id_token?: string,

    mac_key?: string,

    mac_algorithm?: string,

    scope?: string
};

// -----------------------------------------------------------------

export type OAuth2TokenPayload = JwtPayload & {
    /**
     * Token type
     */
    kind: `${OAuth2TokenKind}`,

    /**
     * Subject (userId | robotId | clientId)
     */
    sub?: string,

    /**
     * Self: Subject type (robot | user | client)
     */
    sub_kind?: `${OAuth2SubKind}`,

    /**
     * Subject name
     */
    sub_name?: string,

    /**
     * Audience
     */
    aud?: string | string[],

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

export type OAuth2TokenIntrospectionResponse = {
    active: boolean,
    permissions?: AbilityDescriptor[],
} & Partial<OAuth2TokenPayload>;
