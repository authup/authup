<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/errors</h1>

<p align="center">
    <b>Authup's error classes, error codes and code-to-HTTP-status mapping, with guards that survive JSON.</b><br>
    One error vocabulary for the server, the HTTP client and the consoles, so a caller branches on a code, not a message.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/errors"><img src="https://img.shields.io/npm/v/@authup/errors" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

Every Authup workspace that throws or inspects an error imports this package: the server throws its classes, the HTTP error middleware maps their `code` to a status, and [`@authup/core-http-kit`](https://github.com/authup/authup/tree/master/packages/core-http-kit) and the consoles read the same codes back out of response bodies. Install it directly when your own code calls the Authup API and wants to branch on what went wrong (`isEntityNotFoundError(error)`, `error.code === ErrorCode.JWT_EXPIRED`), or when you build a service on Authup's server packages and want to throw errors the same middleware understands.

## Installation

```shell
npm install @authup/errors
```

ESM only. Node.js `>=26.0.0`. It has one runtime dependency, `@ebec/core`, and no Node-specific APIs.

## Usage

### Throw and map to a status

```typescript
import { EntityNotFoundError, ErrorCode, httpStatusFromCode } from '@authup/errors';

const error = new EntityNotFoundError({ entity: 'user' });

error.message; // 'The user was not found.'
error.code === ErrorCode.ENTITY_NOT_FOUND; // true
httpStatusFromCode(error.code); // 404
httpStatusFromCode(ErrorCode.REGISTRATION_DISABLED); // 400, the fallback
```

- Every class extends `AuthupError` and sets its own `code` and default message. Pass a string to replace the message, or an options object (`message`, `code`, `data`, `cause`, and `entity` on the entity classes).
- `data` is merged into the JSON form, which is how `LoginThrottledError`, `MfaThrottledError` and `DeviceVerificationThrottledError` carry `retryAfter` (seconds) to the client.
- `httpStatusFromCode(code, fallback = 400)` answers from `ERROR_CODE_TO_STATUS`; any code not listed there gets the fallback. `codeFromHttpStatus` goes the other way for errors from a foreign source.

### Recognize an error that crossed the wire

```typescript
import { isAuthupError, isEntityNotFoundError, serializeError } from '@authup/errors';

declare const error: Error;

const body = JSON.parse(JSON.stringify(serializeError(error)));

if (isEntityNotFoundError(body)) {
    // body.code === 'entity_not_found'
}

if (isAuthupError(body)) {
    console.log(body.code, body.message);
}
```

- `serializeError` calls `toJSON()` when the error has one and otherwise spreads its own properties plus `name` and `message`. Use it wherever an error becomes a response body.
- The guards do not need `instanceof`. Each class stamps a `Symbol.for(...)` marker, and `toJSON()` writes the marker chain as strings under the same key, so a guard recognizes the live error and the parsed JSON alike.
- `normalizeError(value)` turns anything thrown (a string, a number, an object) into a real `Error`.

## API

| Export | Kind | Purpose |
|---|---|---|
| `AuthupError` | class | Base class: a `BaseError` from `@ebec/core` with an optional `data` record merged into `toJSON()` |
| `BadRequestError`, `ValidationError` | class | `bad_request` (400) |
| `UnauthorizedError`, `AuthHeaderError`, `BearerTokenMalformedError` | class | `identity_unauthorized`, `unsupported_auth_header_type`, `bearer_token_malformed` (401) |
| `EntityNotFoundError`, `EntityConflictError`, `EntityInactiveError`, `EntityCredentialsInvalidError` | class | `entity_not_found` (404), `entity_conflict` (409), `entity_inactive`, `invalid_credentials` (400); option `entity` names the entity in the message |
| `LoginThrottledError`, `MfaThrottledError`, `DeviceVerificationThrottledError` | class | 429 with `data.retryAfter` |
| `InternalError` | class | `internal_error` (500) |
| `isError`, `isAuthupError`, `is<Class>Error` | function | Duck-type guards, one per class |
| `ErrorCode` | enum | Every code Authup emits: generic, entity, identity, JWT, JWK, OAuth2, permission and policy codes |
| `ERROR_CODE_TO_STATUS`, `httpStatusFromCode`, `codeFromHttpStatus` | const, function | Code-to-status mapping |
| `serializeError`, `normalizeError` | function | JSON boundary and unknown-value normalization |
| `AuthupErrorOptions`, `AuthupErrorInput`, `AuthupEntityErrorOptions`, `AuthupEntityErrorInput` | type | Constructor input types |
| `matchesInstanceof`, `hasInstanceof`, `markInstanceof`, `serializeInstanceofChain`, `INSTANCEOF_PROPERTY`, `BASE_ERROR_INSTANCE` | re-export | The `@ebec/core` marker primitives, for your own error classes |

Each class also exports its marker symbol (`ENTITY_NOT_FOUND_ERROR_INSTANCE`, ...).

## Notes

- **`isAuthupError` needs the marker chain.** An object without the `@instanceof` list (a hand-built `{ code, message }`, or a body from an older server) is not an `AuthupError`, even when it carries an Authup code. Read `body.code` directly in that case.
- **A class guard also accepts the plain code.** `isEntityNotFoundError` is true for any `AuthupError` whose `code` is `entity_not_found`, not only for instances of that class. `ValidationError` and `BadRequestError` share `bad_request`, so `isValidationError` and `isBadRequestError` are both true for either class.
- **The status lives in the mapping, not on the error.** No class carries an HTTP status; codes not in `ERROR_CODE_TO_STATUS` map to 400 by default.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
