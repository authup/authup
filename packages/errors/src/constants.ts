/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ErrorCode {
    // Generic
    BAD_REQUEST = 'bad_request',
    INTERNAL_ERROR = 'internal_error',

    // HTTP Codes
    HTTP_HEADER_AUTH_TYPE_UNSUPPORTED = 'unsupported_auth_header_type',
    HTTP_BEARER_TOKEN_MALFORMED = 'bearer_token_malformed',

    // Identity Auth
    IDENTITY_UNAUTHORIZED = 'identity_unauthorized',

    // Entity Codes
    ENTITY_CREDENTIALS_INVALID = 'invalid_credentials',
    ENTITY_INACTIVE = 'entity_inactive',
    ENTITY_NOT_FOUND = 'entity_not_found',
    ENTITY_CONFLICT = 'entity_conflict',
    ENTITY_RELATION_INVALID = 'entity_relation_invalid',

    // Identity Codes
    REGISTRATION_DISABLED = 'registration_disabled',
    PASSWORD_RECOVERY_DISABLED = 'password_recovery_disabled',
    EMAIL_VERIFICATION_REQUIRED = 'email_verification_required',
    RESET_TOKEN_EXPIRED = 'reset_token_expired',
    LOGIN_ATTEMPT_THROTTLED = 'login_attempt_throttled',
    MFA_ATTEMPT_THROTTLED = 'mfa_attempt_throttled',
    MFA_NOT_CONFIGURABLE = 'mfa_not_configurable',

    // Storage Codes
    STORAGE_INSUFFICIENT = 'storage_insufficient',

    // JWK Codes
    JWK_INVALID = 'jwk_invalid',
    JWK_NOT_FOUND = 'jwk_not_found',

    // JWT Codes
    JWT_INVALID = 'invalid_token',
    JWT_INACTIVE = 'inactive_token',
    JWT_EXPIRED = 'expired_token',

    // Oauth2 Codes
    OAUTH_REDIRECT_URI_MISMATCH = 'redirect_uri_mismatch',
    OAUTH_CLIENT_INVALID = 'invalid_client',
    OAUTH_CLIENT_UNAUTHORIZED = 'unauthorized_client',
    OAUTH_GRANT_INVALID = 'invalid_grant',
    OAUTH_GRANT_TYPE_UNSUPPORTED = 'unsupported_token_grant_type',
    OAUTH_REQUEST_INVALID = 'invalid_request',
    OAUTH_LOGIN_REQUIRED = 'login_required',
    OAUTH_MFA_REQUIRED = 'mfa_required',
    OAUTH_INTERACTION_REQUIRED = 'interaction_required',
    OAUTH_ACCOUNT_SELECTION_REQUIRED = 'account_selection_required',
    OAUTH_CONSENT_REQUIRED = 'consent_required',
    OAUTH_RESPONSE_TYPE_UNSUPPORTED = 'unsupported_response_type',
    OAUTH_SCOPE_INVALID = 'invalid_scope',
    OAUTH_SCOPE_INSUFFICIENT = 'insufficient_scope',

    // Permission Codes
    PERMISSION_NOT_FOUND = 'permission_not_found',
    PERMISSION_DENIED = 'permission_denied',
    PERMISSION_EVALUATION_FAILED = 'permission_evaluation_failed',

    // Policy Codes
    POLICY_EVALUATOR_NOT_FOUND = 'policy_evaluator_not_found',
    POLICY_EVALUATOR_NOT_PROCESSABLE = 'policy_evaluator_not_processable',
    POLICY_EVALUATOR_CONTEXT_INVALID = 'policy_evaluator_context_invalid',
}
