/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationResponseType, OAuth2TokenPayload } from '../oauth2';

export type OpenIDProviderMetadata = {
    /**
     * The fully qualified issuer URL of the server
     */
    issuer: string,

    /**
     * The fully qualified URL of the server’s authorization endpoint defined by RFC 6749
     */
    authorization_endpoint: string,

    /**
     * The fully qualified URI of the server’s public key in JSON Web Key Set (JWKS) format
     */
    jwks_uri: string,

    /**
     * List of the supported OAuth 2.0 response_type values.
     */
    response_types_supported: `${OAuth2AuthorizationResponseType}`[],

    /**
     * List of the supported subject (end-user) identifier types.
     */
    subject_types_supported: string[],

    /**
     * e.g. "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "none"
     */
    id_token_signing_alg_values_supported: string[],

    /**
     * The fully qualified URL of the server’s token endpoint defined by RFC 6749
     */
    token_endpoint: string,

    /**
     *  The fully qualified URL of the server’s introspection_endpoint defined by OAuth 2.0 Token Introspection
     */
    introspection_endpoint: string,

    /**
     * The fully qualified URL of the server’s revocation endpoint defined by OAuth 2.0 Authorization Server
     * Metadata (and sort of in OAuth 2.0 Token Revocation)
     */
    revocation_endpoint: string,

    /**
     * The OAuth 2.0 / OpenID Connect URL of the OP's Dynamic Client Registration Endpoint OpenID.Registration.
     */
    registration_endpoint?: string,

    /**
     * The service documentation URL.
     */
    service_documentation?: string,

    /**
     * The OpenID Connect UserInfo endpoint URL.
     */
    userinfo_endpoint?: string
};

export type OpenIDTokenPayload = OAuth2TokenPayload & {
    // -----------------------------------------------------------------
    // scope: email
    // -----------------------------------------------------------------

    email?: string,

    email_verified?: boolean,

    // -----------------------------------------------------------------
    // scope: phone
    // -----------------------------------------------------------------

    phone_number?: string,

    phone_number_verified?: boolean,

    // -----------------------------------------------------------------
    // scope: address
    // -----------------------------------------------------------------
    address?: Record<string, any>,

    // -----------------------------------------------------------------
    // scope: profile / identity
    // -----------------------------------------------------------------

    name?: string,

    family_name?: string,

    given_name?: string,

    middle_name?: string,

    nickname?: string,

    preferred_username?: string,

    profile?: string,

    picture?: string,

    website?: string,

    gender?: string,

    birthdate?: string,

    roles?: string[],

    zoneinfo?: string,

    locale?: string,

    /**
     * UTC Date in seconds
     */
    updated_at: number
};
