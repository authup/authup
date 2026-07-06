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
    user_agent?: string,

    /**
     * Realm-scoped role claims (roles where realm_id matches a realm).
     */
    realm_access?: OAuth2AccessGrantClaim,

    /**
     * Global role claims (roles whose realm_id is null or missing).
     */
    global_access?: OAuth2AccessGrantClaim,

    /**
     * Refresh tokens: jti of the previous refresh token in the rotation chain
     * (informational — the auth_session_tokens row is authoritative for lineage).
     */
    parent_id?: string,

    /**
     * Access tokens: jti of the refresh token this access token was issued
     * alongside (drives chain-aware access-token revocation).
     */
    refresh_token_id?: string
};

export type OAuth2AccessGrantClaim = {
    roles: string[]
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
    crv?: string;
    d?: string;
    dp?: string;
    dq?: string;
    e?: string;
    k?: string;
    kty?: string;
    n?: string;
    p?: string;
    q?: string;
    qi?: string;
    x?: string;
    y?: string;
    [key: string]: unknown;
};
