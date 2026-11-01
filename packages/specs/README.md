<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/specs</h1>

<p align="center">
    <b>Constants, types and error classes for OAuth 2.0, OpenID Connect, JWT and JWK, as Authup uses them.</b><br>
    The grant names, token payload shape, error codes and scope helpers both sides of an Authup login share.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/specs"><img src="https://img.shields.io/npm/v/@authup/specs" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

`@authup/specs` is a foundation package: [`@authup/core-kit`](https://github.com/authup/authup/tree/master/packages/core-kit), [`@authup/core-http-kit`](https://github.com/authup/authup/tree/master/packages/core-http-kit), the server and the server adapters all take their protocol vocabulary from it. You install it directly when you read Authup tokens or protocol errors yourself, for example to type a decoded access token as `OAuth2TokenPayload` or to compare an error against `OAuth2ErrorCode.INVALID_GRANT`. It is not a general OAuth2 library: it carries what Authup issues and answers, including Authup's own claims such as `realm_name` and `sub_kind`.

## Installation

```shell
npm install @authup/specs
```

ESM only. Node.js `>=26.0.0`, or a browser bundler. There are no peer dependencies.

## Usage

### Token payloads and grants

```typescript
import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenGrant, OAuth2TokenKind } from '@authup/specs';

function isUserAccessToken(payload: OAuth2TokenPayload) : boolean {
    return payload.kind === OAuth2TokenKind.ACCESS &&
        payload.sub_kind === OAuth2SubKind.USER;
}

OAuth2TokenGrant.DEVICE_CODE; // 'urn:ietf:params:oauth:grant-type:device_code'
```

`OAuth2TokenPayload` is the JWT claim set plus Authup's claims: `kind`, `sub_kind`, `realm_id`, `realm_name`, `client_id`, `scope`, `session_id` / `sid`, `amr`, `acr`, `cnf`, `realm_access` and `global_access`. `OAuth2TokenGrantResponse` is the `/token` answer.

### Scopes

```typescript
import { hasOAuth2Scopes, mergeOAuth2Scopes } from '@authup/specs';

hasOAuth2Scopes('openid Email', ['email']); // true
mergeOAuth2Scopes('openid email', ['email', 'roles']); // 'openid email roles'
```

- `hasOAuth2Scopes(granted, required)` lower-cases both sides, accepts a space- or comma-separated string or an array, and returns `false` when nothing is granted.
- `deserializeOAuth2Scope` and `unwrapOAuth2Scope` split and lower-case; `splitOAuth2Scope` and `mergeOAuth2Scopes` split and dedupe but keep the case.

### Errors

The error classes extend `AuthupError` from `@authup/errors` and carry the OAuth2 error code under `data.error`:

```typescript
import { OAuth2ErrorCode, OAuth2GrantError, isJWTError, isOAuth2Error } from '@authup/specs';

const error = OAuth2GrantError.invalid('refresh token is unknown');
error.data?.error === OAuth2ErrorCode.INVALID_GRANT; // true

function describe(e: unknown) : string {
    if (isJWTError(e)) return 'token rejected';
    if (isOAuth2Error(e)) return e.message;
    return 'unknown';
}
```

The `is*` guards match an instance as well as an error rehydrated from JSON, since they read the serialized marker chain rather than the prototype. `isJWTErrorCode` and `isJWKErrorCode` test a bare `code` string.

## API

| Export | Kind | Purpose |
|---|---|---|
| `OAuth2TokenGrant`, `OAuth2TokenKind`, `OAuth2SubKind` | enum | Grant types, token kinds (`access_token`, `refresh_token`, `id_token`, `mfa_token`, ...), subject kinds |
| `OAuth2AuthorizationResponseType`, `OAuth2AuthorizationCodeChallengeMethod`, `OAuth2AuthorizationPrompt`, `OAuth2UIColorMode` | enum | `/authorize` parameters |
| `OAuth2AuthenticationMethodReference`, `OAuth2AuthenticationContextClass` | enum | `amr` (`pwd`, `otp`, `ext`) and `acr` (`urn:authup:pwd`, `urn:authup:mfa`) values |
| `OAuth2ErrorCode` | enum | RFC 6749, OIDC and RFC 8628 error codes |
| `OAuth2TokenGrantResponse`, `OAuth2TokenPayload`, `OAuth2TokenIntrospectionResponse`, `OAuth2TokenPermission`, `OAuth2JsonWebKey` | type | Token endpoint answers and token contents |
| `OAuth2Error` and `OAuth2RequestError`, `OAuth2ClientError`, `OAuth2ClientUnauthorizedError`, `OAuth2GrantError`, `OAuth2GrantTypeError`, `OAuth2ScopeError`, `OAuth2ResponseTypeError`, `OAuth2AccessDeniedError`, `OAuth2LoginRequiredError`, `OAuth2MfaRequiredError`, `OAuth2DeviceAuthorizationError`, `OAuth2ServerError` | class | Protocol errors with static factories (`OAuth2GrantError.invalid()`, `OAuth2DeviceAuthorizationError.slowDown()`, ...) |
| `isOAuth2Error` and an `isOAuth2*Error` guard per class (none for `OAuth2LoginRequiredError`) | function | Error guards |
| `serializeOAuth2Scope`, `deserializeOAuth2Scope`, `unwrapOAuth2Scope`, `splitOAuth2Scope`, `mergeOAuth2Scopes`, `hasOAuth2Scopes` | function | Scope string handling |
| `JWTAlgorithm` | enum | `HS*`, `RS*`, `ES*`, `PS*` (256, 384, 512) |
| `JWTHeader`, `JWTClaims` | interface | JWT header and registered claims |
| `JWTError`, `isJWTError`, `isJWTErrorCode` | class, function | Token errors (`expired_token`, `inactive_token`, `invalid_token`) |
| `getJWTClaimByPattern` | function | Read claims by a path pattern, optionally matched against a value or regex |
| `JWKType`, `JWKUse` | enum | Key types (`oct`, `rsa`, `ec`) and uses (`sig`, `enc`) |
| `JWKError`, `isJWKError`, `isJWKErrorCode` | class, function | Key errors |
| `OpenIDProviderMetadata`, `OpenIDTokenPayload`, `OpenIDClaims` | type | The discovery document, the id_token payload and the OIDC Core standard claims |
| `isOpenIDProviderMetadata` | function | Guard for a discovery document |

## Notes

- **`JWKType` is Authup's key type, not the JWK `kty`.** Its values are lower case (`rsa`, `ec`, `oct`); RFC 7517 spells `kty` as `RSA` and `EC`.
- **An absent OpenID claim is an omitted key.** `OpenIDClaims` types every claim as optional, never `null`, and Authup leaves a claim out rather than sending `null`.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
