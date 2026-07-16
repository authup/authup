# Web

The Web server adapter provides a transport-neutral primitive for HTTP services that operate on the standard
`Request` object (routup v5, Hono, Elysia, Bun.serve, raw Web `fetch` handlers, ...).

It does **not** ship a middleware factory. The package exposes a single `verifyRequest(request, options)` helper —
your handler decides what to do with the result.

## Installation

Add the package as a dependency to the project.

```sh
npm install @authup/server-adapter-web --save
```

## verifyRequest

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { TokenVerifier } from '@authup/server-adapter-kit';

const tokenVerifier = new TokenVerifier({
    baseURL: 'http://localhost:3001/',
    creator: {
        type: 'user',
        name: 'admin',
        password: 'start123',
    },
});
```

Contract:

| Header / fallback state              | Result                                         |
|--------------------------------------|------------------------------------------------|
| No `Authorization` and no fallback   | resolves with `undefined`                      |
| Valid `Bearer <token>` and verify ok | resolves with `TokenVerificationData`          |
| Malformed `Authorization` header     | rejects with `BearerTokenMalformedError`       |
| `tokenVerifier.verify` rejects       | rejects with the underlying verifier error     |

The optional `tokenByRequest` callback runs only when the `Authorization` header is absent. The consumer
extracts the token from wherever they like (cookie, custom header, query string) — the adapter does not parse cookies.

## Certificate-bound tokens

If verification returns a token with `cnf.x5t#S256`, `verifyRequest` fails
closed unless `certificateThumbprintByRequest` returns the same base64url
SHA-256 thumbprint of the leaf certificate's DER encoding:

```typescript
const data = await verifyRequest(request, {
    tokenVerifier,
    certificateThumbprintByRequest: (request) =>
        trustedProxyCertificateThumbprint(request),
});
```

The callback is the application's TLS/proxy trust boundary. Derive its result
from a direct TLS connection or a header that a trusted private proxy always
removes and overwrites; do not return an unchecked public request header. The
adapter compares the thumbprint only and deliberately does not repeat the
authorization server's certificate-chain validation.

Enforcement lives inside `TokenVerifier.verify()` itself — the helper only
forwards a lazy thumbprint provider. Calling `verify(token)` directly on a
bound token therefore also fails closed; pass the presented thumbprint via
`verify(token, { certificateThumbprint })` (a value or a provider, invoked
only when the token carries a `cnf` binding).

## Routup v5

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { useCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';

router.use(async (event) => {
    const data = await verifyRequest(event.request, {
        tokenVerifier,
        tokenByRequest: () => useCookie(event, CookieName.ACCESS_TOKEN),
    });
    if (data) {
        event.context.identity = data;
    }
});
```

## Hono

```typescript
import { verifyRequest } from '@authup/server-adapter-web';
import { getCookie } from 'hono/cookie';
import { CookieName } from '@authup/core-http-kit';

app.use('*', async (c, next) => {
    const data = await verifyRequest(c.req.raw, {
        tokenVerifier,
        tokenByRequest: () => getCookie(c, CookieName.ACCESS_TOKEN),
    });
    if (data) {
        c.set('identity', data);
    }
    await next();
});
```
