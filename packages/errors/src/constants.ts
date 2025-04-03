/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ErrorCode {
    // HTTP Codes
    HTTP_HEADER_AUTH_TYPE_UNSUPPORTED = 'unsupported_auth_header_type',

    // Entity Codes
    ENTITY_CREDENTIALS_INVALID = 'invalid_credentials',
    ENTITY_INACTIVE = 'entity_inactive',
    ENTITY_NOT_FOUND = 'entity_not_found',

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
    OAUTH_GRANT_INVALID = 'invalid_grant',
    OAUTH_GRANT_TYPE_UNSUPPORTED = 'unsupported_token_grant_type',
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
