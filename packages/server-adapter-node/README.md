<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-adapter-node</h1>

<p align="center">
    <b>Authenticate Node http and Express requests with Authup access tokens.</b><br>
    A <code>(req, res, next)</code> middleware that reads the bearer token, verifies it and hands you the claims.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-adapter-node"><img src="https://img.shields.io/npm/v/@authup/server-adapter-node" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/server-adapter-node?

Every route of an API behind Authup needs the same first step: take the `Authorization` header, verify the token Authup issued and attach who is calling. This package is that step for anything built on Node's `IncomingMessage`, with the verification itself done by [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit).

| Concern | Without it | With it |
|---|---|---|
| **Header parsing** | Split `Bearer <token>` yourself and handle malformed values | Parsed for you; a malformed header becomes an error passed to `next` |
| **Verification** | Fetch keys or call introspection per framework | One `TokenVerifier`, local or remote, shared with your other transports |
| **Tokens outside the header** | Hand-written cookie or query fallbacks | `tokenByRequest` reads a fallback when no `Authorization` header is sent |
| **Bound tokens** | Compare certificate thumbprints yourself | `certificateThumbprintByRequest` feeds the RFC 8705 check |

## Installation

```shell
npm install @authup/server-adapter-node @authup/server-adapter-kit
```

`TokenVerifier` comes from `@authup/server-adapter-kit`, which you import directly. The package is ESM-only, has no peer dependencies and needs Node.js `>=26.0.0`.

## Usage

### Middleware

```typescript
import type { TokenVerificationData } from '@authup/server-adapter-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';
import { createMiddleware } from '@authup/server-adapter-node';

declare module 'node:http' {
    interface IncomingMessage {
        auth?: TokenVerificationData;
    }
}

app.use(createMiddleware({
    tokenVerifier: new TokenVerifier({ baseURL: 'https://auth.example.com' }),
    tokenVerifierHandler: (req, data) => {
        req.auth = data; // data.sub, data.sub_kind, data.realm_name, data.scope
    },
}));

app.get('/orders', (req, res) => {
    if (!req.auth) {
        res.statusCode = 401;
        res.end();
        return;
    }

    res.end(`orders of ${req.auth.sub}`);
});
```

The module augmentation types `req.auth` once for every handler. Express's `Request` extends `IncomingMessage`, so it sees the property too.

- A request without a token calls `next()` without running `tokenVerifierHandler`. Reject it in your route if the route needs a caller.
- A malformed header or a token that fails verification calls `next(error)`; the handler is not run.
- An error thrown by `tokenVerifierHandler` is passed to `next(error)` too.

See [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit) for local versus remote verification, caching and permissions.

### Verify inside a handler

```typescript
import { createServer } from 'node:http';
import { TokenVerifier } from '@authup/server-adapter-kit';
import { verifyRequest } from '@authup/server-adapter-node';

const tokenVerifier = new TokenVerifier({ baseURL: 'https://auth.example.com' });

createServer(async (req, res) => {
    try {
        const data = await verifyRequest(req, { tokenVerifier });
        res.statusCode = data ? 200 : 401;
        res.end(data ? data.sub : 'unauthenticated');
    } catch {
        res.statusCode = 401;
        res.end('invalid token');
    }
});
```

`verifyRequest` resolves the verification data, resolves `undefined` when the request carries no token, and throws otherwise.

### Read the token from elsewhere

```typescript
const middleware = createMiddleware({
    tokenVerifier,
    tokenByRequest: (req) => readCookie(req, 'access_token'),
    certificateThumbprintByRequest: (req) => thumbprintOf(req),
    tokenVerifierHandler: (req, data) => {
        req.auth = data;
    },
});
```

`tokenByRequest` is only called when the request has no `Authorization` header. Its value may carry a `Bearer ` prefix or not. The adapter parses no cookies itself.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenVerifier` | `ITokenVerifier` | (required) | Usually a `TokenVerifier` from `@authup/server-adapter-kit` |
| `tokenVerifierHandler` | `(req, data) => void \| Promise<void>` | (required, middleware only) | Runs after a token verified; store the claims here |
| `tokenByRequest` | `(req) => string \| undefined` | `undefined` | Fallback token source when no `Authorization` header is present |
| `certificateThumbprintByRequest` | `(req) => string \| undefined \| Promise<string \| undefined>` | `undefined` | SHA-256 thumbprint of the client certificate, for certificate-bound tokens |

## API

| Export | Kind | Purpose |
|---|---|---|
| `createMiddleware` | function | Builds the `(req, res, next)` middleware |
| `verifyRequest` | function | Verifies one `IncomingMessage` without the middleware shape |
| `MiddlewareOptions`, `VerifyRequestOptions` | types | The option objects above |
| `Middleware`, `Next` | types | The middleware and `next` signatures |

## Notes

- **Only `Bearer` is accepted in the header.** A `Basic` or other scheme in `Authorization` is an error, not a missing token, so `tokenByRequest` is not consulted for it.
- **Errors carry their codes.** A malformed header throws `BearerTokenMalformedError` (`bearer_token_malformed`); a failed verification throws a `JWTError` (`invalid_token`, `expired_token`, `inactive_token`). Both map to HTTP 401.
- **A certificate-bound token without a thumbprint fails.** Behind a TLS-terminating proxy, read the forwarded certificate in `certificateThumbprintByRequest`.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
