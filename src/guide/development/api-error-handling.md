# Errors

Depending on the request payload, the request might not be successfully. In that case,
the api responds with an error payload, which looks like this:

```json
{
    "message": "The application could not fulfill the request",
    "code": "bad_request",
    "statusCode": 400
}
```

The error codes can be used to distinguish between different error responses.
The following error codes are available: 

```ts
export enum ErrorCode {
    HEADER_INVALID = 'invalid_header',
    HEADER_AUTH_TYPE_UNSUPPORTED = 'unsupported_auth_header_type',

    CREDENTIALS_INVALID = 'invalid_credentials',

    ENTITY_INACTIVE = 'inactive_entity',

    TOKEN_REDIRECT_URI_MISMATCH = 'redirect_uri_mismatch',
    TOKEN_INVALID = 'invalid_token',
    TOKEN_INACTIVE = 'inactive_token',
    TOKEN_EXPIRED = 'expired_token',
    TOKEN_CLIENT_INVALID = 'invalid_client',
    TOKEN_GRANT_INVALID = 'invalid_grant',
    TOKEN_GRANT_TYPE_UNSUPPORTED = 'unsupported_token_grant_type',
    TOKEN_SCOPE_INVALID = 'invalid_scope',
    TOKEN_SCOPE_INSUFFICIENT = 'insufficient_scope',
    TOKEN_SUB_KIND_INVALID = 'invalid_token_sub_kind',

    PERMISSION_NOT_FOUND = 'permission_not_found',
    PERMISSION_DENIED = 'permission_denied',
    PERMISSION_EVALUATION_FAILED = 'permission_evaluation_failed',

    POLICY_EVALUATOR_NOT_FOUND = 'policy_evaluator_not_found',
    POLICY_EVALUATOR_NOT_PROCESSABLE = 'policy_evaluator_not_processable',
    POLICY_EVALUATOR_CONTEXT_INVALID = 'policy_evaluator_context_invalid',
}
```
