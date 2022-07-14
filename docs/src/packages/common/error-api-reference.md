# Error(s)

## `ErrorCode`

```typescript
export enum ErrorCode {
    ABILITY_INVALID = 'invalid_ability',

    HEADER_INVALID = 'invalid_header',
    HEADER_AUTH_TYPE_UNSUPPORTED = 'unsupported_auth_header_type',

    CREDENTIALS_INVALID = 'invalid_credentials',

    ENTITY_INACTIVE = 'inactive_entity',

    TOKEN_INVALID = 'invalid_token',
    TOKEN_INACTIVE = 'inactive_token',
    TOKEN_EXPIRED = 'expired_token',
    TOKEN_CLIENT_INVALID = 'invalid_client',
    TOKEN_GRANT_INVALID = 'invalid_grant',
    TOKEN_GRANT_TYPE_UNSUPPORTED = 'unsupported_token_grant_type',
    TOKEN_SCOPE_INVALID = 'invalid_scope',
    TOKEN_SUB_KIND_INVALID = 'invalid_token_sub_kind',
}

```
