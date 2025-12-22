/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '../json-web-token';
import type { OAuth2SubKind, OAuth2TokenKind } from './constants';

export type OAuth2TokenGrantResponse = {
    access_token: string,

    refresh_token?: string,

    refresh_token_expires_in?: number,

    expires_in: number,

    token_type: string,

    id_token?: string,

    mac_key?: string,

    mac_algorithm?: string,

    scope?: string
};

export type OAuth2TokenPayload = JWTClaims & {
    /**
     * Associated session.
     */
    session_id?: string,

    /**
     * Token type
     */
    kind?: `${OAuth2TokenKind}`,

    /**
     * Self: Subject type (robot | user | client)
     */
    sub_kind?: `${OAuth2SubKind}`,

    /**
     * Subject name
     */
    sub_name?: string,

    /**
     * Scopes (e.g. "scope1 scope2")
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
     * Self: realm_name
     */
    realm_name?: string,

    /**
     * Self: remote address
     */
    remote_address?: string

    /**
     * Self: user agent
     */
    user_agent?: string
};

// todo: this should be removed.
export type OAuth2TokenPermission = {
    name: string,
    policy?: {
        type: string,
        [key: string]: any,
    },
    client_id?: string | null,
    realm_id?: string
};

export type OAuth2TokenIntrospectionResponse = OAuth2TokenPayload & {
    active: boolean,
    permissions?: OAuth2TokenPermission[]
};

export type OAuth2JsonWebKey = {
    alg: string,
    kid: string,
    crv?: string | undefined;
    d?: string | undefined;
    dp?: string | undefined;
    dq?: string | undefined;
    e: string | undefined;
    k?: string | undefined;
    kty: string | undefined;
    n: string | undefined;
    p?: string | undefined;
    q?: string | undefined;
    qi?: string | undefined;
    x?: string | undefined;
    y?: string | undefined;
    [key: string]: unknown;
};
