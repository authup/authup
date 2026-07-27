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

## Helpers

`@authup/errors` exports a small toolkit for working with thrown values:

### `isError`

Duck-typed guard for `Error`. Matches anything carrying the standard `name` / `message` / `stack` triplet, regardless of class or realm. Prefer this over `instanceof Error` whenever cross-realm boundaries (worker threads, duplicate-module copies) are in play.

```ts
import { isError } from '@authup/errors';

if (isError(input)) {
    // input is typed as Error
}
```

### `normalizeError`

Coerce an arbitrary thrown value into a real `Error` instance. Useful at error-pipeline boundaries (catch blocks, error middleware) where TypeScript hands you `unknown` but downstream code wants something with `.name` / `.message`.

```ts
import { normalizeError } from '@authup/errors';

try {
    /* ... */
} catch (e) {
    const error = normalizeError(e); // string / unknown → Error
    throw error;
}
```

### `serializeError`

Convert an `Error` into a plain object suitable for embedding in a JSON response body. Calls `error.toJSON()` if present, preserving every attribute the error chose to surface (`code`, `cause`, `errors`, `issues`, `data`, ...). Falls back to spreading the Error's enumerable own properties alongside the standard `name` / `message` pair.

```ts
import { normalizeError, serializeError } from '@authup/errors';

try {
    /* ... */
} catch (e) {
    return {
        status: 'error',
        data: serializeError(normalizeError(e)),
    };
}
```

### `isAuthupError`

Discriminates an `AuthupError` (or any subclass) from arbitrary errors. Uses the cross-realm `markInstanceof` chain (fast path) plus a shape check (slow path).

```ts
import { isAuthupError } from '@authup/errors';

if (isAuthupError(error)) {
    // error has .code, .issues, ...
}
```

### `matchesInstanceof`

The fast path shared by every duck-type guard. Checks whether the input's `@instanceof` class-marker chain carries a marker — as the native `Symbol.for(...)` symbol (an in-process instance) or as the symbol's description string. The string form exists because `AuthupError.toJSON()` serializes the chain into the JSON payload (symbols don't survive `JSON.stringify`), so guards keep the full inheritance match for errors rehydrated from a JSON response body:

```ts
import { isUnauthorizedError } from '@authup/errors';

const rehydrated = JSON.parse(JSON.stringify(AuthHeaderError.unsupportedType('X')));

isUnauthorizedError(rehydrated); // true — the serialized chain carries the ancestor marker
```

Error payloads therefore include an `@instanceof` string list alongside `code` / `message` / `issues`. When writing a new guard, use `matchesInstanceof` from `@authup/errors` as the fast path — plain `hasInstanceof` only matches the symbol form and silently loses the inheritance match for rehydrated errors.
