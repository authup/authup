/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum OAuth2TokenGrant {
    AUTHORIZATION_CODE = 'authorization_code',
    CLIENT_CREDENTIALS = 'client_credentials',
    PASSWORD = 'password',
    ROBOT_CREDENTIALS = 'robot_credentials',
    REFRESH_TOKEN = 'refresh_token',
}

export enum OAuth2TokenKind {
    ACCESS = 'access_token',
    ID_TOKEN = 'id_token',
    REFRESH = 'refresh_token',
}

export enum OAuth2SubKind {
    CLIENT = 'client',
    USER = 'user',
    ROBOT = 'robot',
}

export enum OAuth2AuthorizationResponseType {
    NONE = 'none',
    CODE = 'code',
    TOKEN = 'token',
    ID_TOKEN = 'id_token',
}

export enum OAuth2AuthorizationCodeChallengeMethod {
    SHA_256 = 'S256',
    PLAIN = 'plain',
}

/**
 * OIDC Core 1.0 §3.1.2.1 `prompt` values.
 */
export enum OAuth2AuthorizationPrompt {
    NONE = 'none',
    LOGIN = 'login',
    CONSENT = 'consent',
    SELECT_ACCOUNT = 'select_account',
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export enum OAuth2ErrorCode {
    INVALID_REQUEST = 'invalid_request',

    INVALID_CLIENT = 'invalid_client',

    INVALID_GRANT = 'invalid_grant',

    UNAUTHORIZED_CLIENT = 'unauthorized_client',

    UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',

    UNSUPPORTED_RESPONSE_TYPE = 'unsupported_response_type',

    INVALID_SCOPE = 'invalid_scope',

    INSUFFICIENT_SCOPE = 'insufficient_scope',

    SERVER_ERROR = 'server_error',

    /**
     * OIDC Core 1.0 §3.1.2.6 — the End-User is required to authenticate.
     * Used when the authenticated identity may not proceed with the
     * authorization request (e.g. realm mismatch, or prompt=login/max_age).
     */
    LOGIN_REQUIRED = 'login_required',

    /**
     * OIDC Core 1.0 §3.1.2.6 — interaction is required but prompt=none forbade it.
     */
    INTERACTION_REQUIRED = 'interaction_required',

    /**
     * OIDC Core 1.0 §3.1.2.6 — account selection is required (prompt=select_account
     * with prompt=none, or the server cannot determine the account).
     */
    ACCOUNT_SELECTION_REQUIRED = 'account_selection_required',

    /**
     * OIDC Core 1.0 §3.1.2.6 — consent is required but prompt=none forbade it.
     */
    CONSENT_REQUIRED = 'consent_required',

    /**
     * Authup extension (Auth0 precedent) — the subject must present a
     * second factor to continue. Distinct from login_required so RPs can
     * tell "log in again" from "complete the MFA challenge".
     */
    MFA_REQUIRED = 'mfa_required',
}

/**
 * RFC 8176 authentication method reference values emitted in the `amr`
 * claim (plus the authup-local `ext` — RFC 8176 registers no value for
 * "federated identity provider").
 */
export enum OAuth2AuthenticationMethodReference {
    PASSWORD = 'pwd',
    OTP = 'otp',
    EXTERNAL = 'ext',
}

/**
 * The two coarse assurance levels emitted in / accepted for the `acr`
 * claim (urn-style — OIDC Core reserves the bare "0"). Deliberately NOT
 * a level DSL.
 */
export enum OAuth2AuthenticationContextClass {
    PASSWORD = 'urn:authup:pwd',
    MFA = 'urn:authup:mfa',
}
