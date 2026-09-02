/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationResponseType, OAuth2TokenPayload } from '../oauth2';
import type { OpenIDClaims } from './claims';

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
     * OAuth 2.0 client authentication methods accepted by the token endpoint.
     */
    token_endpoint_auth_methods_supported?: string[],

    /**
     * RFC 8705: this server can issue certificate-bound access tokens.
     */
    tls_client_certificate_bound_access_tokens?: boolean,

    /**
     * RFC 8705 endpoint aliases exposed through a dedicated mTLS origin.
     */
    mtls_endpoint_aliases?: {
        token_endpoint?: string,
        introspection_endpoint?: string,
        revocation_endpoint?: string,
        userinfo_endpoint?: string,
    },

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
     * OIDC Core §3.1.2.1 `prompt` values supported by the OP.
     */
    prompt_values_supported?: string[],

    /**
     * OIDC Discovery: `acr` values the OP supports (urn:authup:pwd,
     * urn:authup:mfa).
     */
    acr_values_supported?: string[],

    /**
     * OIDC RP-Initiated Logout 1.0 — the OP's end-session (logout) endpoint.
     */
    end_session_endpoint?: string,

    /**
     * OIDC Back-Channel Logout 1.0: the OP pushes a logout token to a
     * client's registered back-channel logout URI when a session ends.
     */
    backchannel_logout_supported?: boolean,

    /**
     * OIDC Back-Channel Logout 1.0: the pushed logout token carries `sid`.
     */
    backchannel_logout_session_supported?: boolean,

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

export type OpenIDTokenPayload = OAuth2TokenPayload & OpenIDClaims;
