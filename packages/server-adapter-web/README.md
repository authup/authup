<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-adapter-web</h1>

<p align="center">
    <b>Verify the Authup access token of a Web <code>Request</code>, in any framework built on it.</b><br>
    One function you wrap in your framework's middleware shape: Hono, routup, Bun.serve or a plain fetch handler.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-adapter-web"><img src="https://img.shields.io/npm/v/@authup/server-adapter-web" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/server-adapter-web?

Frameworks built on the Web `Request` API each have their own middleware signature, so an adapter per framework would never keep up. This package ships the part they share: read the bearer token from a `Request`, verify it with [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit) and return the claims. The few lines that store the result are yours.

| Concern | Without it | With it |
|---|---|---|
| **Header parsing** | Split `Bearer <token>` yourself and handle malformed values | Parsed for you; a malformed header throws |
| **Verification** | Fetch keys or call introspection per framework | One `TokenVerifier`, local or remote, shared with your other transports |
| **Tokens outside the header** | Hand-written cookie or query fallbacks | `tokenByRequest` reads a fallback when no `Authorization` header is sent |
| **Bound tokens** | Compare certificate thumbprints yourself | `certificateThumbprintByRequest` feeds the RFC 8705 check |

## Installation

```shell
npm install @authup/server-adapter-web @authup/server-adapter-kit
```

`TokenVerifier` comes from `@authup/server-adapter-kit`, which you import directly. The package is ESM-only and has no peer dependencies. Its `engines` field asks for Node.js `>=26.0.0`; the verifier package imports `node:crypto`, so another runtime must resolve Node built-ins.

## Usage

### Fetch handler

```typescript
import { TokenVerifier } from '@authup/server-adapter-kit';
import { verifyRequest } from '@authup/server-adapter-web';

const tokenVerifier = new TokenVerifier({ baseURL: 'https://auth.example.com' });

export async function handle(request: Request): Promise<Response> {
    let data;
    try {
        data = await verifyRequest(request, { tokenVerifier });
    } catch {
        return new Response('invalid token', { status: 401 });
    }

    if (!data) {
        return new Response('unauthenticated', { status: 401 });
    }

    return new Response(`hello ${data.sub}`);
}
```

`verifyRequest` resolves the verification data, resolves `undefined` when the request carries no token, and throws for a malformed `Authorization` header or a token the verifier rejects.

See [`@authup/server-adapter-kit`](https://github.com/authup/authup/tree/master/packages/server-adapter-kit) for local versus remote verification, caching and permissions.

### Hand the claims to your handler

```typescript
import type { TokenVerificationData } from '@authup/server-adapter-kit';

type AuthedHandler = (request: Request, auth: TokenVerificationData) => Response | Promise<Response>;

function withAuth(handler: AuthedHandler) {
    return async (request: Request): Promise<Response> => {
        const auth = await verifyRequest(request, { tokenVerifier }).catch(() => undefined);
        if (!auth) {
            return new Response(null, { status: 401 });
        }

        return handler(request, auth);
    };
}

export const orders = withAuth((_request, auth) => new Response(`orders of ${auth.sub}`));
```

The claims travel as an argument, typed once, instead of being attached to the `Request`. In a framework with its own context object, pass the framework's underlying `Request` (Hono: `c.req.raw`) and store the result in that context.

### Read the token from elsewhere

```typescript
const data = await verifyRequest(request, {
    tokenVerifier,
    tokenByRequest: (req) => new URL(req.url).searchParams.get('access_token') ?? undefined,
});
```

`tokenByRequest` is only called when the request has no `Authorization` header. Its value may carry a `Bearer ` prefix or not. The adapter parses no cookies itself.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenVerifier` | `ITokenVerifier` | (required) | Usually a `TokenVerifier` from `@authup/server-adapter-kit` |
| `tokenByRequest` | `(request) => string \| undefined` | `undefined` | Fallback token source when no `Authorization` header is present |
| `certificateThumbprintByRequest` | `(request) => string \| undefined \| Promise<string \| undefined>` | `undefined` | SHA-256 thumbprint of the client certificate, for certificate-bound tokens |

## API

| Export | Kind | Purpose |
|---|---|---|
| `verifyRequest` | function | Verifies one `Request` |
| `VerifyRequestOptions` | type | The option object above |

## Notes

- **Only `Bearer` is accepted in the header.** A `Basic` or other scheme in `Authorization` throws `BearerTokenMalformedError` (`bearer_token_malformed`), and `tokenByRequest` is not consulted.
- **Verification errors are `JWTError`s** (`invalid_token`, `expired_token`, `inactive_token`). All of them, and the malformed header, map to HTTP 401.
- **A query string token is logged by proxies.** Prefer a header or a cookie for `tokenByRequest` where you can.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
